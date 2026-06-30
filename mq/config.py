"""
kafka/config.py
---------------
Centralised Kafka configuration and topic definitions for ResuFlow.

All settings are read from environment variables (via core.settings) so that
the same code works locally (Docker Compose) and in Kubernetes (ConfigMap/Secret).
"""

from __future__ import annotations

from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Topic definitions
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TopicConfig:
    """Immutable descriptor for a Kafka topic."""
    name: str
    partitions: int
    replication_factor: int


class Topics:
    """
    Single source of truth for every topic used in ResuFlow.

    resume_processing
    ─────────────────
    Carries resume parse jobs. Partitioned by task_id for even load
    distribution across consumer workers. 3 partitions lets us run up to
    3 parallel workers without re-partitioning.
    Replication factor is 1 for local dev; override to 3 in production.
    """

    RESUME_PROCESSING = TopicConfig(
        name="resume-processing",
        partitions=3,
        replication_factor=1,  # bump to 3 in prod
    )

    RESUME_PROCESSING_DLQ = TopicConfig(
        name="resume-processing-dlq",
        partitions=1,
        replication_factor=1,
    )

    # Convenience list for the admin script.
    ALL: list[TopicConfig] = [RESUME_PROCESSING, RESUME_PROCESSING_DLQ]


# ---------------------------------------------------------------------------
# Message schemas (plain dataclasses — no external dependency)
# ---------------------------------------------------------------------------

@dataclass
class ResumeJobMessage:
    """Payload published to `resume-processing`."""
    task_id: str       # UUID string — used as the Kafka message key
    user_id: str       # UUID string
    file_path: str     # absolute or relative path to the saved upload
    file_extension: str  # e.g. ".pdf", ".docx", ".txt"
    retry_count: int = 0
    error_message: str | None = None
