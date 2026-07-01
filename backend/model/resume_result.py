import uuid
from datetime import datetime
from sqlalchemy import Column, Text, DateTime, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from db.database import Base


class ResumeResult(Base):
    __tablename__ = "resume_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), unique=True, nullable=False)

    name = Column(Text, nullable=True)
    email = Column(Text, nullable=True)
    phone = Column(Text, nullable=True)

    skills = Column(ARRAY(Text), nullable=True)
    experience_years = Column(Integer, nullable=True)

    raw_text = Column(Text, nullable=True)

    # --- LLM-extracted fields (not available via regex) ---
    summary = Column(Text, nullable=True)
    education = Column(ARRAY(Text), nullable=True)
    work_experience = Column(JSON, nullable=True)  # list of {company, title, duration, highlights}

    # --- pgvector embedding (384-dim from MiniLM) ---
    embedding = Column(Vector(384), nullable=True)

    # --- RAG Analysis fields (Gemini-powered) ---
    overall_score = Column(Integer, nullable=True)          # 0-100 quality score
    summary_verdict = Column(Text, nullable=True)           # 2-3 sentence overall assessment
    section_feedback = Column(JSON, nullable=True)          # list of {section, score, strengths, weaknesses}
    suggestions = Column(ARRAY(Text), nullable=True)        # actionable improvement tips
    ats_tips = Column(ARRAY(Text), nullable=True)           # ATS compatibility advice
    keywords_missing = Column(ARRAY(Text), nullable=True)   # important missing keywords

    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="resume_result", lazy="raise")
