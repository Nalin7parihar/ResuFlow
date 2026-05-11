"""
services/resume_service.py
--------------------------
HTTP-facing resume service (producer side).

upload_and_parse_resume now follows the Kafka pattern:
  1. Validate + save file to disk
  2. INSERT Task (status=queued)
  3. Publish a message to the `resume-processing` Kafka topic
  4. Return 202 Accepted (task_id only)

The actual parsing is handled asynchronously by the Kafka consumer worker
(kafka/worker.py).  The extraction helpers have been moved to
services/resume_parser.py so the worker can import them without pulling in
FastAPI/HTTP dependencies.
"""

from __future__ import annotations

import uuid
from pathlib import Path
from uuid import UUID

import aiofiles
from fastapi import Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from mq.config import ResumeJobMessage
from mq.producer import KafkaProducerClient, get_kafka_producer
from model.resume_result import ResumeResult
from model.task import Task
from schema.resume_result import ResumeResultResponse
from schema.task import TaskResponse

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

UPLOADS_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


async def upload_and_parse_resume(
    user_id: UUID,
    file: UploadFile,
    db: AsyncSession,
    producer: KafkaProducerClient,
) -> TaskResponse:
    """
    Producer-side pipeline:
      1. Validate file extension
      2. Save file to disk
      3. INSERT Task (status=queued)
      4. Publish ResumeJobMessage to Kafka → consumer worker takes it from here
      5. Return 202 Accepted with the task_id so the client can poll for status

    The consumer (kafka/worker.py) handles parsing and DB result insertion.
    """
    # --- 1. Validate extension ---
    filename = file.filename or "upload"
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{extension}'. Allowed: {ALLOWED_EXTENSIONS}",
        )

    # --- 2. Save file to disk ---
    user_upload_dir = UPLOADS_DIR / str(user_id)
    user_upload_dir.mkdir(parents=True, exist_ok=True)

    saved_filename = f"{uuid.uuid4()}{extension}"
    file_path = user_upload_dir / saved_filename

    content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # --- 3. INSERT Task (status=queued) ---
    task = Task(
        user_id=user_id,
        task_type="resume_processing",
        status="queued",
        file_url=str(file_path),
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    # --- 4. Publish to Kafka ---
    try:
        msg = ResumeJobMessage(
            task_id=str(task.id),
            user_id=str(user_id),
            file_path=str(file_path),
            file_extension=extension,
        )
        await producer.publish_resume_job(msg)
    except Exception as exc:
        # If Kafka publish fails we mark the task failed — the file is already
        # on disk so the operator can replay manually if needed.
        task.status = "failed"
        task.error_message = f"Kafka publish failed: {exc}"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to queue resume job: {exc}",
        )

    # --- 5. Return accepted response ---
    return TaskResponse.model_validate(task)


async def list_user_tasks(user_id: UUID, db: AsyncSession) -> list[TaskResponse]:
    """Return all resume tasks belonging to the authenticated user."""
    rows = await db.execute(
        select(Task)
        .where(Task.user_id == user_id)
        .order_by(Task.created_at.desc())
    )
    tasks = rows.scalars().all()
    return [TaskResponse.model_validate(t) for t in tasks]


async def get_task(task_id: UUID, user_id: UUID, db: AsyncSession) -> TaskResponse:
    """Fetch a single task, enforcing ownership."""
    row = await db.execute(select(Task).where(Task.id == task_id))
    task = row.scalars().first()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return TaskResponse.model_validate(task)


async def get_resume_result(
    task_id: UUID, user_id: UUID, db: AsyncSession
) -> ResumeResultResponse:
    """
    Fetch the ResumeResult for a completed task.
    Returns 404 if no result exists yet (task still processing / failed).
    Returns 403 if the task belongs to another user.
    """
    # Verify ownership via the parent task
    task_row = await db.execute(select(Task).where(Task.id == task_id))
    task = task_row.scalars().first()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if task.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Result not available — task status is '{task.status}'",
        )

    result_row = await db.execute(
        select(ResumeResult).where(ResumeResult.task_id == task_id)
    )
    result = result_row.scalars().first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume result not found",
        )

    return ResumeResultResponse.model_validate(result)
