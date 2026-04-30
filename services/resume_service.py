"""
services/resume_service.py
--------------------------
Handles resume upload, parsing, keyword extraction, and DB persistence.
All work is done synchronously, inline.

# TODO: Replace the parsing block with a Kafka producer message once the
#       worker infrastructure is in place. The extraction helpers below
#       can be moved as-is into the consumer worker.
"""

from __future__ import annotations

import io
import re
import uuid
from pathlib import Path
from typing import List
from uuid import UUID

import aiofiles
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from model.resume_result import ResumeResult
from model.task import Task
from schema.resume_result import ResumeResultResponse
from schema.task import TaskResponse

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

UPLOADS_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

# Curated skills keyword list (extend freely)
_SKILLS_VOCAB: List[str] = [
    "python", "java", "javascript", "typescript", "golang", "rust", "c++", "c#",
    "ruby", "kotlin", "swift", "scala", "r", "matlab",
    "fastapi", "django", "flask", "spring", "react", "angular", "vue", "node",
    "express", "nextjs", "nestjs",
    "sql", "postgresql", "mysql", "sqlite", "mongodb", "redis", "elasticsearch",
    "kafka", "rabbitmq", "celery",
    "docker", "kubernetes", "terraform", "ansible", "jenkins", "github actions",
    "aws", "gcp", "azure",
    "git", "linux", "bash", "rest", "graphql", "grpc",
    "machine learning", "deep learning", "nlp", "computer vision",
    "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch",
    "html", "css", "tailwind", "sass",
    "agile", "scrum", "ci/cd", "tdd", "microservices",
]

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _extract_text_from_pdf(content: bytes) -> str:
    """Extract plain text from PDF bytes using PyMuPDF."""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=content, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse PDF: {exc}",
        )


def _extract_text_from_docx(content: bytes) -> str:
    """Extract plain text from DOCX bytes using python-docx."""
    try:
        from docx import Document

        doc = Document(io.BytesIO(content))
        return "\n".join(para.text for para in doc.paragraphs)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse DOCX: {exc}",
        )


def _extract_raw_text(content: bytes, extension: str) -> str:
    """Dispatch to the correct parser based on file extension."""
    if extension == ".pdf":
        return _extract_text_from_pdf(content)
    if extension == ".docx":
        return _extract_text_from_docx(content)
    # Plain text fallback
    return content.decode("utf-8", errors="replace")


def _extract_email(text: str) -> str | None:
    match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    return match.group(0) if match else None


def _extract_phone(text: str) -> str | None:
    match = re.search(
        r"(\+?\d[\d\s\-().]{7,}\d)",
        text,
    )
    return match.group(0).strip() if match else None


def _extract_name(text: str) -> str | None:
    """
    Heuristic: the candidate's name is usually the first non-empty,
    non-email, non-phone line of the resume.
    """
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if "@" in line or re.search(r"\d{5,}", line):
            continue
        # Likely a name if it's short and has only alpha + spaces
        if re.fullmatch(r"[A-Za-z]+(?: [A-Za-z]+){0,4}", line):
            return line
    return None


def _extract_experience_years(text: str) -> int | None:
    """
    Match patterns like:
      '5+ years', '3 years of experience', 'over 10 years', '2-year experience'
    Returns the first matched integer.
    """
    pattern = re.compile(
        r"(\d+)\+?\s*(?:-\s*\d+\s*)?years?(?:\s+of(?:\s+relevant)?\s+experience)?",
        re.IGNORECASE,
    )
    match = pattern.search(text)
    return int(match.group(1)) if match else None


def _extract_skills(text: str) -> List[str]:
    """Return every skill from _SKILLS_VOCAB found in the resume text (case-insensitive)."""
    lower_text = text.lower()
    return [skill for skill in _SKILLS_VOCAB if skill in lower_text]


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


async def upload_and_parse_resume(
    user_id: UUID,
    file: UploadFile,
    db: AsyncSession,
) -> ResumeResultResponse:
    """
    Single synchronous entry-point for the resume pipeline:
      1. Validate file extension
      2. Save file to disk
      3. INSERT Task (status=queued)
      4. UPDATE Task (status=processing)
      5. Extract raw text (PDF / DOCX / TXT)
      6. Run regex-based keyword extraction
      7. INSERT ResumeResult
      8. UPDATE Task (status=completed)
      9. Return ResumeResultResponse

    On any failure after step 3, the task is marked 'failed' with an
    error_message before re-raising.
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

    # --- 4-8: Parse + store (wrapped so failures update task status) ---
    try:
        # 4. Mark processing
        task.status = "processing"
        await db.commit()

        # 5. Extract raw text
        raw_text = _extract_raw_text(content, extension)

        # 6. Keyword extraction
        name = _extract_name(raw_text)
        email = _extract_email(raw_text)
        phone = _extract_phone(raw_text)
        skills = _extract_skills(raw_text)
        experience_years = _extract_experience_years(raw_text)

        # 7. INSERT ResumeResult
        result = ResumeResult(
            task_id=task.id,
            name=name,
            email=email,
            phone=phone,
            skills=skills or None,
            experience_years=experience_years,
            raw_text=raw_text,
        )
        db.add(result)

        # 8. Mark completed
        task.status = "completed"
        await db.commit()
        await db.refresh(result)

    except HTTPException:
        task.status = "failed"
        task.error_message = "File parsing failed — unsupported or corrupt file."
        await db.commit()
        raise
    except Exception as exc:
        task.status = "failed"
        task.error_message = str(exc)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resume processing failed: {exc}",
        )

    # 9. Return response
    return ResumeResultResponse.model_validate(result)


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
