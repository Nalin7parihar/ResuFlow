from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_current_user_id
from db.database import get_db
from mq.producer import KafkaProducerClient, get_kafka_producer
from schema.resume_result import ResumeResultResponse
from schema.task import TaskResponse
from services import resume_service

router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.post(
    "/upload",
    response_model=TaskResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a resume — queues an async parse job",
)
async def upload_resume(
    file: UploadFile = File(..., description="Resume file (.pdf, .docx, or .txt)"),
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    producer: KafkaProducerClient = Depends(get_kafka_producer),
) -> TaskResponse:
    """
    Upload a resume file.

    The endpoint:
    1. Saves the file to disk
    2. Creates a Task record (status=queued)
    3. Publishes a parse job to Kafka
    4. Returns 202 Accepted with the task_id

    Poll `GET /resumes/tasks/{task_id}` for status updates.
    Once `status=completed`, fetch results from `GET /resumes/tasks/{task_id}/result`.
    """
    return await resume_service.upload_and_parse_resume(current_user_id, file, db, producer)


@router.get(
    "/tasks",
    response_model=list[TaskResponse],
    summary="List all resume tasks for the current user",
)
async def list_tasks(
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[TaskResponse]:
    """Return all resume processing tasks belonging to the authenticated user, newest first."""
    return await resume_service.list_user_tasks(current_user_id, db)


@router.get(
    "/tasks/{task_id}",
    response_model=TaskResponse,
    summary="Get the status of a single resume task",
)
async def get_task(
    task_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> TaskResponse:
    """Fetch a task by ID. Returns 403 if it belongs to another user."""
    return await resume_service.get_task(task_id, current_user_id, db)


@router.get(
    "/tasks/{task_id}/result",
    response_model=ResumeResultResponse,
    summary="Get the parsed result for a completed resume task",
)
async def get_resume_result(
    task_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ResumeResultResponse:
    """
    Fetch the structured resume data for a completed task.
    Returns 409 if the task is still queued/processing/failed.
    Returns 403 if the task belongs to another user.
    """
    return await resume_service.get_resume_result(task_id, current_user_id, db)
