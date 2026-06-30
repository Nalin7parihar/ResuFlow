"""
mq/worker.py
------------
Standalone Kafka consumer worker — run as a separate process:

    python -m mq.worker

This process:
  1. Connects to Kafka and joins the `resuflow-workers` consumer group.
  2. Polls the `resume-processing` topic for resume parse jobs.
  3. For each job:
       a. Reads the uploaded file from disk.
       b. Extracts structured data via LLM (Gemini) with regex fallback.
       c. Generates a vector embedding (MiniLM) and stores it in pgvector.
       d. Runs RAG analysis — retrieves from pgvector, feeds to Gemini for
          score, feedback, suggestions, and ATS tips.
       e. Inserts a ResumeResult row into PostgreSQL (parsed + analysis).
       f. Updates the Task status to `completed` (or `failed`).
  4. Commits the Kafka offset only after successful DB writes.

Scaling: start N copies of this process (up to 3, matching partition count)
and Kafka will automatically distribute partitions across them with no config
changes needed.
"""

from __future__ import annotations

import asyncio
import logging
import signal
from pathlib import Path
from uuid import UUID

from sqlalchemy import select

from db.database import AsyncSessionLocal
from mq.config import ResumeJobMessage
from mq.consumer import KafkaConsumerClient
from mq.producer import KafkaProducerClient
from model.resume_result import ResumeResult
from model.task import Task
from services.llm_parser import parse_resume_with_llm
from services.embedding_service import store_resume_embedding
from services.resume_analyzer import analyze_resume_with_rag
from core.settings import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("resuflow.worker")

MAX_RESUME_RETRIES = settings.RESUME_MAX_RETRIES


# ---------------------------------------------------------------------------
# Core handler — called for every Kafka message
# ---------------------------------------------------------------------------

async def handle_resume_job(msg: ResumeJobMessage, producer: KafkaProducerClient) -> None:
    """
    Process a single resume parse job.

    Pipeline:
      1. Parse resume (Gemini structured extraction, regex fallback)
      2. Insert ResumeResult with parsed data
      3. Store embedding in pgvector
      4. RAG analysis — retrieve from pgvector → Gemini → score/feedback
      5. Update ResumeResult with analysis fields
      6. Mark task completed

    Idempotency: if the task is already `completed` we skip it silently —
    this handles at-least-once redelivery without double-writing results.
    """
    task_id = UUID(msg.task_id)
    file_path = Path(msg.file_path)

    async with AsyncSessionLocal() as db:
        row = await db.execute(select(Task).where(Task.id == task_id))
        task: Task | None = row.scalars().first()

        if task is None:
            logger.warning("Task %s not found in DB — skipping", msg.task_id)
            return

        if task.status == "completed":
            logger.info("Task %s already completed — skipping (idempotent)", msg.task_id)
            return

        if task.retry_count > msg.retry_count:
            logger.info(
                "Task %s already advanced to retry_count=%d — skipping stale message",
                msg.task_id,
                task.retry_count,
            )
            return

        # --- Mark processing ---
        task.status = "processing"
        await db.commit()

        # --- Read file from disk ---
        try:
            content = file_path.read_bytes()
        except OSError as exc:
            await _handle_failure(
                db=db,
                task=task,
                msg=msg,
                producer=producer,
                failure_message=f"File not found on disk: {exc}",
            )
            return

        # --- Step 1: Parse resume (LLM extraction — outside the DB transaction) ---
        try:
            parsed = await parse_resume_with_llm(content, msg.file_extension)
        except Exception as exc:
            await _handle_failure(
                db=db,
                task=task,
                msg=msg,
                producer=producer,
                failure_message=f"Parsing failed: {exc}",
            )
            return

        # --- Step 2: Persist parsed result ---
        result = ResumeResult(
            task_id=task_id,
            name=parsed["name"],
            email=parsed["email"],
            phone=parsed["phone"],
            skills=parsed["skills"],
            experience_years=parsed["experience_years"],
            raw_text=parsed["raw_text"],
            summary=parsed.get("summary"),
            education=parsed.get("education"),
            work_experience=parsed.get("work_experience"),
        )
        db.add(result)
        await db.commit()

        logger.info(
            "Parsed data saved for task %s | name=%s skills=%d",
            msg.task_id,
            parsed.get("name", "—"),
            len(parsed.get("skills") or []),
        )

        # --- Step 3: Store embedding in pgvector ---
        try:
            await store_resume_embedding(
                task_id=task_id,
                user_id=msg.user_id,
                text=parsed["raw_text"],
                metadata={
                    "name": parsed.get("name"),
                    "email": parsed.get("email"),
                    "skills": parsed.get("skills"),
                },
            )
            logger.info("Embedding stored for task %s", msg.task_id)
        except Exception as exc:
            # Embedding failure is non-critical — log and continue
            logger.warning(
                "Embedding storage failed for task %s (non-critical): %s",
                msg.task_id,
                exc,
            )

        # --- Step 4: RAG Analysis — retrieve from pgvector → Gemini ---
        try:
            analysis = await analyze_resume_with_rag(
                task_id=task_id,
                user_id=msg.user_id,
                raw_text=parsed["raw_text"],
            )

            if analysis:
                # Step 5: Update ResumeResult with analysis fields
                result.overall_score = analysis.get("overall_score")
                result.summary_verdict = analysis.get("summary_verdict")
                result.section_feedback = analysis.get("section_feedback")
                result.suggestions = analysis.get("suggestions")
                result.ats_tips = analysis.get("ats_tips")
                result.keywords_missing = analysis.get("keywords_missing")
                await db.commit()

                logger.info(
                    "RAG analysis saved for task %s | score=%s suggestions=%d",
                    msg.task_id,
                    analysis.get("overall_score", "N/A"),
                    len(analysis.get("suggestions") or []),
                )
            else:
                logger.warning(
                    "RAG analysis returned None for task %s — result saved without analysis",
                    msg.task_id,
                )

        except Exception as exc:
            # Analysis failure is non-critical — the parsed resume is already saved
            logger.warning(
                "RAG analysis failed for task %s (non-critical): %s",
                msg.task_id,
                exc,
            )

        # --- Step 6: Mark task completed ---
        task.status = "completed"
        task.error_message = None
        await db.commit()

    logger.info(
        "Task %s completed | name=%s skills=%d score=%s",
        msg.task_id,
        parsed.get("name", "—"),
        len(parsed.get("skills") or []),
        analysis.get("overall_score", "N/A") if analysis else "N/A",
    )


async def _handle_failure(
    db,
    task: Task,
    msg: ResumeJobMessage,
    producer: KafkaProducerClient,
    failure_message: str,
) -> None:
    failure_count = task.retry_count + 1
    task.retry_count = failure_count
    task.error_message = failure_message

    terminal_failure = failure_count > MAX_RESUME_RETRIES
    task.status = "failed" if terminal_failure else "queued"

    await db.commit()

    outbound_message = ResumeJobMessage(
        task_id=str(task.id),
        user_id=msg.user_id,
        file_path=msg.file_path,
        file_extension=msg.file_extension,
        retry_count=failure_count,
        error_message=failure_message,
    )

    if terminal_failure:
        await producer.publish_dead_letter_job(outbound_message)
        logger.error(
            "Task %s moved to DLQ after %d retries: %s",
            task.id,
            task.retry_count,
            failure_message,
        )
        return

    await producer.publish_resume_job(outbound_message)
    logger.warning(
        "Task %s scheduled for retry #%d: %s",
        task.id,
        task.retry_count,
        failure_message,
    )


# ---------------------------------------------------------------------------
# Worker lifecycle
# ---------------------------------------------------------------------------

async def run_worker() -> None:
    client = KafkaConsumerClient()
    producer = KafkaProducerClient()
    await client.start()
    await producer.start()

    loop = asyncio.get_running_loop()

    # Graceful shutdown on SIGTERM / SIGINT
    def _shutdown(sig_name: str) -> None:
        logger.info("Received %s — shutting down worker…", sig_name)
        asyncio.ensure_future(client.stop())
        asyncio.ensure_future(producer.stop())

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _shutdown, sig.name)

    try:
        await client.consume_resume_jobs(lambda msg: handle_resume_job(msg, producer))
    finally:
        await client.stop()
        await producer.stop()
        logger.info("Worker exited cleanly.")


if __name__ == "__main__":
    asyncio.run(run_worker())
