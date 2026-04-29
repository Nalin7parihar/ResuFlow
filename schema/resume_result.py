from uuid import UUID
from datetime import datetime
from typing import List
from pydantic import BaseModel


class ResumeResultCreate(BaseModel):
    task_id: UUID
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    skills: List[str] | None = None
    experience_years: int | None = None
    raw_text: str | None = None


class ResumeResultResponse(BaseModel):
    id: UUID
    task_id: UUID
    name: str | None
    email: str | None
    phone: str | None
    skills: List[str] | None
    experience_years: int | None
    raw_text: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
