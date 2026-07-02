"""
services/resume_analyzer.py
----------------------------
RAG-powered resume analysis using pgvector retrieval + Google Gemini generation.

Pipeline (runs inside the Kafka worker after embedding storage):
    1. RETRIEVE  — query pgvector for the just-stored resume embedding
    2. AUGMENT   — build a Gemini prompt with the retrieved resume content
    3. GENERATE  — Gemini returns structured analysis (score, feedback, suggestions)

If the RAG pipeline fails at any step the caller receives ``None`` so the
worker can still mark the task as completed with parsed-only data.
"""

from __future__ import annotations

import logging
from typing import List
from uuid import UUID

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from core.settings import settings
from services.embedding_service import search_similar_resumes

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic schemas — drive Gemini's structured output
# ---------------------------------------------------------------------------

class SectionFeedback(BaseModel):
    """Feedback for a single resume section."""
    section: str = Field(description="Section name, e.g. 'Work Experience', 'Skills', 'Education', 'Summary', 'Projects'")
    score: int = Field(ge=0, le=100, description="Quality score for this section (0-100)")
    strengths: List[str] = Field(default_factory=list, description="What the candidate does well in this section")
    weaknesses: List[str] = Field(default_factory=list, description="Areas needing improvement in this section")


class ResumeAnalysis(BaseModel):
    """Full structured analysis returned by Gemini."""
    overall_score: int = Field(ge=0, le=100, description="Overall resume quality score (0-100)")
    summary_verdict: str = Field(description="2-3 sentence overall assessment of the resume")
    section_feedback: List[SectionFeedback] = Field(
        description="Per-section breakdown with scores, strengths, and weaknesses"
    )
    suggestions: List[str] = Field(
        description="Actionable improvement suggestions the candidate should implement"
    )
    ats_tips: List[str] = Field(
        description="ATS (Applicant Tracking System) compatibility tips — formatting and keyword advice"
    )
    keywords_missing: List[str] = Field(
        description="Important industry keywords or skills that are missing from the resume"
    )


# ---------------------------------------------------------------------------
# System prompt for resume analysis
# ---------------------------------------------------------------------------

_ANALYSIS_SYSTEM_PROMPT = """\
You are a senior resume reviewer and career coach with 15+ years of experience
in technical recruiting.  You are given the full text of a candidate's resume
that was retrieved from a vector database.

Your job is to produce a **thorough, honest, and constructive** analysis.

Evaluation criteria (weight each roughly equally):
1. **Content Quality** — Are achievements quantified?  Is the experience
   relevant?  Are skills clearly listed?
2. **Structure & Formatting** — Is the resume well-organised?  Are sections
   clearly delineated?  Is it concise (ideally 1-2 pages)?
3. **Impact & Action Verbs** — Does the candidate use strong action verbs?
   Are bullet points results-oriented rather than duty-oriented?
4. **ATS Compatibility** — Does the resume avoid tables, images, headers/
   footers, and unusual formatting that ATS systems can't parse?  Are
   standard section headings used?
5. **Skills Relevance** — Are the listed skills relevant to the candidate's
   target role?  Are important industry-standard tools/frameworks mentioned?

Rules:
- Be specific — reference actual lines or sections from the resume.
- Do NOT invent information that is not in the resume.
- Provide at least 3 actionable suggestions.
- Provide at least 2 ATS-specific tips.
- For keywords_missing, list skills/tools commonly expected for the
  candidate's apparent role that are absent from the resume.
- Score honestly — a perfect 100 should be extremely rare.
  Typical good resumes score 60-80.
"""


# ---------------------------------------------------------------------------
# Lazy-initialised Gemini chain
# ---------------------------------------------------------------------------

_analysis_llm = None


def _get_analysis_llm():
    """Lazy-init the Gemini model with structured output for analysis."""
    global _analysis_llm
    if _analysis_llm is None:
        llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            temperature=0.2,  # Slightly creative for feedback writing
            google_api_key=settings.GOOGLE_API_KEY,
        )
        _analysis_llm = llm.with_structured_output(ResumeAnalysis, method="json_schema")
        logger.info("Initialised Gemini analysis chain (model=%s)", settings.LLM_MODEL)
    return _analysis_llm


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def analyze_resume_with_rag(
    task_id: UUID,
    user_id: str,
    raw_text: str,
) -> dict | None:
    """
    Full RAG pipeline: Retrieve → Augment → Generate.

    Parameters
    ----------
    task_id : UUID
        The task whose resume embedding was just stored in pgvector.
    user_id : str
        Owner's UUID string — used to scope the pgvector similarity search.
    raw_text : str
        The raw resume text (used as the retrieval query and as a fallback
        if the vector search returns nothing).

    Returns
    -------
    dict | None
        The analysis results as a dict compatible with ResumeResult columns,
        or None if the pipeline fails at any step.
    """

    # ------------------------------------------------------------------
    # Step 1: RETRIEVE — query pgvector for the resume content
    # ------------------------------------------------------------------
    try:
        # Use the first ~200 chars of the resume as the similarity query
        # (this will match the embedding we just stored)
        retrieval_query = raw_text[:500]
        retrieved = await search_similar_resumes(
            query=retrieval_query,
            user_id=UUID(user_id),
            k=1,
        )

        if retrieved:
            # Use the retrieved content from pgvector (validates the RAG pipeline)
            resume_content = retrieved[0].get("snippet", raw_text[:500])
            logger.info(
                "RAG retrieval succeeded for task_id=%s — similarity score=%s",
                task_id,
                retrieved[0].get("score"),
            )
        else:
            # Fallback: use the raw text directly
            resume_content = raw_text
            logger.warning(
                "RAG retrieval returned no results for task_id=%s — using raw text",
                task_id,
            )

    except Exception as exc:
        logger.warning(
            "RAG retrieval failed for task_id=%s (%s: %s) — using raw text as fallback",
            task_id,
            type(exc).__name__,
            exc,
        )
        resume_content = raw_text

    # ------------------------------------------------------------------
    # Step 2 & 3: AUGMENT + GENERATE — feed to Gemini for analysis
    # ------------------------------------------------------------------
    try:
        chain = _get_analysis_llm()

        # Augment the prompt with the retrieved resume content
        user_prompt = (
            "Here is the candidate's resume text retrieved from the vector database. "
            "Please analyze it thoroughly and provide your structured assessment.\n\n"
            "--- RESUME START ---\n"
            f"{resume_content}\n"
            "--- RESUME END ---"
        )

        messages = [
            SystemMessage(content=_ANALYSIS_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ]

        import asyncio
        analysis: ResumeAnalysis = await asyncio.to_thread(chain.invoke, messages)
        result = analysis.model_dump()

        # Serialise section_feedback to list[dict] for JSON column storage
        if result.get("section_feedback"):
            result["section_feedback"] = [
                sf if isinstance(sf, dict) else sf.model_dump()
                for sf in result["section_feedback"]
            ]

        logger.info(
            "RAG analysis completed for task_id=%s | overall_score=%d suggestions=%d",
            task_id,
            result.get("overall_score", 0),
            len(result.get("suggestions") or []),
        )
        return result

    except Exception as exc:
        logger.error(
            "RAG analysis (Gemini) failed for task_id=%s: %s — analysis will be null",
            task_id,
            exc,
            exc_info=True,
        )
        return None
