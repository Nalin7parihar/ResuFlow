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
       b. Parses it (PDF / DOCX / TXT).
       c. Inserts a ResumeResult row into PostgreSQL.
       d. Updates the Task status to `completed` (or `failed`).
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
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import AsyncSessionLocal
from mq.config import ResumeJobMessage
from mq.consumer import KafkaConsumerClient
from model.resume_result import ResumeResult
from model.task import Task
from services.resume_parser import parse_resume

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("resuflow.worker")


# ---------------------------------------------------------------------------
# Core handler — called for every Kafka message
# ---------------------------------------------------------------------------

async def handle_resume_job(msg: ResumeJobMessage) -> None:
    """
    Process a single resume parse job.

    Idempotency: if the task is already `completed` we skip it silently —
    this handles at-least-once redelivery without double-writing results.
    """
    task_id = UUID(msg.task_id)
    file_path = Path(msg.file_path)

    async with AsyncSessionLocal() as db:
        async with db.begin():
            # --- Fetch task ---
            row = await db.execute(select(Task).where(Task.id == task_id))
            task: Task | None = row.scalars().first()

            if task is None:
                logger.warning("Task %s not found in DB — skipping", msg.task_id)
                return

            if task.status == "completed":
                logger.info("Task %s already completed — skipping (idempotent)", msg.task_id)
                return

            # --- Mark processing ---
            task.status = "processing"
            # flush inside the transaction so the status is visible immediately
            await db.flush()

        # --- Read file from disk ---
        try:
            content = file_path.read_bytes()
        except OSError as exc:
            async with db.begin():
                task.status = "failed"
                task.error_message = f"File not found on disk: {exc}"
            logger.error("Could not read file for task %s: %s", msg.task_id, exc)
            return

        # --- Parse resume (CPU work — outside the DB transaction) ---
        try:
            parsed = parse_resume(content, msg.file_extension)
        except Exception as exc:
            async with db.begin():
                task.status = "failed"
                task.error_message = f"Parsing failed: {exc}"
            logger.error("Parsing failed for task %s: %s", msg.task_id, exc, exc_info=True)
            return

        # --- Persist result + mark completed ---
        async with db.begin():
            result = ResumeResult(
                task_id=task_id,
                name=parsed["name"],
                email=parsed["email"],
                phone=parsed["phone"],
                skills=parsed["skills"],
                experience_years=parsed["experience_years"],
                raw_text=parsed["raw_text"],
            )
            db.add(result)
            task.status = "completed"
            task.error_message = None

    logger.info(
        "Task %s completed | name=%s skills=%d",
        msg.task_id,
        parsed.get("name", "—"),
        len(parsed.get("skills") or []),
    )


# ---------------------------------------------------------------------------
# Worker lifecycle
# ---------------------------------------------------------------------------

async def run_worker() -> None:
    client = KafkaConsumerClient()
    await client.start()

    loop = asyncio.get_running_loop()

    # Graceful shutdown on SIGTERM / SIGINT
    def _shutdown(sig_name: str) -> None:
        logger.info("Received %s — shutting down worker…", sig_name)
        asyncio.ensure_future(client.stop())

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _shutdown, sig.name)

    try:
        await client.consume_resume_jobs(handle_resume_job)
    finally:
        await client.stop()
        logger.info("Worker exited cleanly.")


if __name__ == "__main__":
    asyncio.run(run_worker())
