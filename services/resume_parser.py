"""
services/resume_parser.py
-------------------------
Pure parsing helpers — no HTTP, no database, no FastAPI.

These functions were originally inline in resume_service.py. Extracting them
here means both the synchronous service (legacy) and the Kafka worker can
import them without pulling in FastAPI dependencies.
"""

from __future__ import annotations

import io
import re
from typing import List


# ---------------------------------------------------------------------------
# Skills vocabulary — extend freely
# ---------------------------------------------------------------------------

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
# Text extraction
# ---------------------------------------------------------------------------

def extract_text_from_pdf(content: bytes) -> str:
    """Extract plain text from PDF bytes using PyMuPDF."""
    import fitz  # PyMuPDF
    doc = fitz.open(stream=content, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def extract_text_from_docx(content: bytes) -> str:
    """Extract plain text from DOCX bytes using python-docx."""
    from docx import Document
    doc = Document(io.BytesIO(content))
    return "\n".join(para.text for para in doc.paragraphs)


def extract_raw_text(content: bytes, extension: str) -> str:
    """Dispatch to the correct parser based on file extension."""
    if extension == ".pdf":
        return extract_text_from_pdf(content)
    if extension == ".docx":
        return extract_text_from_docx(content)
    # Plain text fallback
    return content.decode("utf-8", errors="replace")


# ---------------------------------------------------------------------------
# Field extractors
# ---------------------------------------------------------------------------

def extract_email(text: str) -> str | None:
    match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    return match.group(0) if match else None


def extract_phone(text: str) -> str | None:
    match = re.search(r"(\+?\d[\d\s\-().]{7,}\d)", text)
    return match.group(0).strip() if match else None


def extract_name(text: str) -> str | None:
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
        if re.fullmatch(r"[A-Za-z]+(?: [A-Za-z]+){0,4}", line):
            return line
    return None


def extract_experience_years(text: str) -> int | None:
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


def extract_skills(text: str) -> List[str]:
    """Return every skill from the vocabulary found in the resume text (case-insensitive)."""
    lower_text = text.lower()
    return [skill for skill in _SKILLS_VOCAB if skill in lower_text]


# ---------------------------------------------------------------------------
# Convenience: parse all fields in one call
# ---------------------------------------------------------------------------

def parse_resume(content: bytes, extension: str) -> dict:
    """
    Full pipeline: raw text extraction → field extraction.

    Returns a dict with keys:
        raw_text, name, email, phone, skills, experience_years
    """
    raw_text = extract_raw_text(content, extension)
    return {
        "raw_text": raw_text,
        "name": extract_name(raw_text),
        "email": extract_email(raw_text),
        "phone": extract_phone(raw_text),
        "skills": extract_skills(raw_text) or None,
        "experience_years": extract_experience_years(raw_text),
    }
