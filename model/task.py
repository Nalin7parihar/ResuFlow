import uuid
from datetime import datetime
from sqlalchemy import Column, Text, DateTime, Integer, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.database import Base


class Task(Base):
    __tablename__ = "tasks"

    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'processing', 'completed', 'failed')",
            name="tasks_status_check",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_type = Column(Text, nullable=False)  # e.g. 'resume_processing'
    status = Column(Text, nullable=False)
    file_url = Column(Text, nullable=False)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="tasks", lazy="raise")
    resume_result = relationship("ResumeResult", back_populates="task", uselist=False, cascade="all, delete-orphan", lazy="raise")
