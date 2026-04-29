import uuid
from datetime import datetime
from sqlalchemy import Column, Text, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
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

    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="resume_result", lazy="raise")
