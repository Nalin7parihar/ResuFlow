"""
services/llm_parser.py
----------------------
LLM-powered resume structured extraction using LangChain + Google Gemini.

Replaces the regex-based field extraction from ``resume_parser.py`` while
keeping the raw-text extraction helpers (PDF / DOCX / TXT) intact.

Pipeline:
    raw bytes  ──►  extract_raw_text()  ──►  Gemini structured output  ──►  dict

If the LLM call fails (network, rate-limit, invalid response), the function
transparently falls back to the legacy regex parser so the Kafka worker never
sees an unrecoverable error from this layer alone.
"""

from __future__ import annotations

import logging
from typing import List

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from core.settings import settings
from services.resume_parser import extract_raw_text, parse_resume as regex_parse_resume

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic schemas — these drive the LLM's structured output
# ---------------------------------------------------------------------------

class WorkExperience(BaseModel):
    """A single work-experience entry extracted from the resume."""
    company: str = Field(description="Company or organisation name")
    title: str = Field(description="Job title / role held by the candidate")
    duration: str | None = Field(default=None, description="Employment period, e.g. 'Jan 2022 – Mar 2024'")
    highlights: List[str] | None = Field(default=None, description="Key achievements or responsibilities")


class ParsedResume(BaseModel):
    """Structured resume data extracted by the LLM."""
    name: str | None = Field(default=None, description="Full name of the candidate")
    email: str | None = Field(default=None, description="Email address")
    phone: str | None = Field(default=None, description="Phone number including country code if present")
    skills: List[str] | None = Field(default=None, description="Technical and professional skills mentioned")
    experience_years: int | None = Field(default=None, description="Total years of professional experience")
    summary: str | None = Field(default=None, description="Brief 2-3 sentence professional summary of the candidate")
    education: List[str] | None = Field(
        default=None,
        description="Degrees, certifications, and institutions, e.g. 'B.Tech in CS — IIT Delhi (2020)'",
    )
    work_experience: List[WorkExperience] | None = Field(
        default=None,
        description="Chronological list of work experiences, most recent first",
    )


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a resume parser. Given the raw text of a candidate's resume, extract
structured information into the requested JSON schema.

Rules:
- Only extract information that is explicitly present in the resume text.
- Do NOT invent or hallucinate details.
- If a field is not found, return null for that field.
- For experience_years, calculate from work history dates if not stated explicitly.
- For skills, include both technical skills and tools/frameworks.
- Keep the summary concise (2-3 sentences max).
- For education, combine degree + institution + year into a single string per entry.
"""


# ---------------------------------------------------------------------------
# LLM chain (lazy-initialised singleton)
# ---------------------------------------------------------------------------

_structured_llm = None


def _get_structured_llm():
    """Lazy-init the Gemini model with structured output binding."""
    global _structured_llm
    if _structured_llm is None:
        llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            temperature=settings.LLM_TEMPERATURE,
            google_api_key=settings.GOOGLE_API_KEY,
        )
        _structured_llm = llm.with_structured_output(ParsedResume, method="json_schema")
        logger.info("Initialised Gemini structured-output chain (model=%s)", settings.LLM_MODEL)
    return _structured_llm


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def parse_resume_with_llm(content: bytes, extension: str) -> dict:
    """
    Full pipeline: raw text extraction → LLM structured extraction.

    Returns a dict compatible with the existing ``parse_resume()`` signature
    so the Kafka worker needs minimal changes.

    Falls back to the regex parser if the LLM call fails.
    """
    # Step 1: Extract raw text (reuses the existing PDF/DOCX/TXT helpers)
    raw_text = extract_raw_text(content, extension)

    # Step 2: LLM structured extraction
    try:
        chain = _get_structured_llm()
        messages = [
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content=raw_text),
        ]
        import asyncio
        parsed: ParsedResume = await asyncio.to_thread(chain.invoke, messages)

        result = parsed.model_dump()
        result["raw_text"] = raw_text

        # Serialise work_experience to list[dict] for JSON column storage
        if result.get("work_experience"):
            result["work_experience"] = [
                we if isinstance(we, dict) else we.model_dump()
                for we in result["work_experience"]
            ]

        logger.info(
            "LLM extraction succeeded | name=%s skills=%d",
            result.get("name", "—"),
            len(result.get("skills") or []),
        )
        return result

    except Exception as exc:
        logger.warning(
            "LLM extraction failed (%s: %s) — falling back to regex parser",
            type(exc).__name__,
            exc,
        )
        return regex_parse_resume(content, extension)
