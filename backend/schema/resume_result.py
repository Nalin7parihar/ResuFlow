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
    summary: str | None = None
    education: List[str] | None = None
    work_experience: List[dict] | None = None
    # RAG Analysis fields
    overall_score: int | None = None
    summary_verdict: str | None = None
    section_feedback: List[dict] | None = None
    suggestions: List[str] | None = None
    ats_tips: List[str] | None = None
    keywords_missing: List[str] | None = None


class ResumeResultResponse(BaseModel):
    id: UUID
    task_id: UUID
    name: str | None
    email: str | None
    phone: str | None
    skills: List[str] | None
    experience_years: int | None
    raw_text: str | None
    summary: str | None
    education: List[str] | None
    work_experience: List[dict] | None
    # RAG Analysis fields
    overall_score: int | None
    summary_verdict: str | None
    section_feedback: List[dict] | None
    suggestions: List[str] | None
    ats_tips: List[str] | None
    keywords_missing: List[str] | None
    created_at: datetime

    model_config = {"from_attributes": True}
