from uuid import UUID
from datetime import datetime
from typing import Literal
from pydantic import BaseModel

TaskStatus = Literal["queued", "processing", "completed", "failed"]


class TaskCreate(BaseModel):
    task_type: str
    status: TaskStatus = "queued"
    file_url: str


class TaskUpdate(BaseModel):
    status: TaskStatus | None = None
    retry_count: int | None = None
    error_message: str | None = None


class TaskResponse(BaseModel):
    id: UUID
    user_id: UUID
    task_type: str
    status: str
    file_url: str
    retry_count: int
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
