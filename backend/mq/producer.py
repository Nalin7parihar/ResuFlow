"""
mq/producer.py
--------------
Async Kafka producer singleton for ResuFlow.

Usage (FastAPI dependency injection):
    from mq.producer import get_kafka_producer, KafkaProducerClient

    @router.post("/upload")
    async def upload(producer: KafkaProducerClient = Depends(get_kafka_producer)):
        await producer.publish_resume_job(msg)

Lifecycle is managed in main.py via the lifespan context manager.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict

from aiokafka import AIOKafkaProducer

from core.settings import settings
from mq.config import ResumeJobMessage, Topics

logger = logging.getLogger(__name__)


class KafkaProducerClient:
    """
    Thin async wrapper around AIOKafkaProducer.

    - Serialises message values to UTF-8 JSON.
    - Uses task_id as the message key so Kafka routes by key hash
      (even partition distribution across 3 partitions).
    - `acks="all"` ensures the broker leader + all in-sync replicas
      confirm before the send future resolves — no silent message loss.
    """

    def __init__(self) -> None:
        self._producer: AIOKafkaProducer | None = None

    async def start(self) -> None:
        """Start the underlying AIOKafkaProducer. Call once at app startup."""
        self._producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            client_id="resuflow-api",
            acks="all",
            enable_idempotence=True,
            compression_type="gzip",
            linger_ms=5,
            retry_backoff_ms=200,
        )
        await self._producer.start()
        logger.info(
            "KafkaProducer started — bootstrap_servers=%s",
            settings.KAFKA_BOOTSTRAP_SERVERS,
        )

    async def stop(self) -> None:
        """Flush pending messages and close the connection gracefully."""
        if self._producer:
            await self._producer.stop()
            logger.info("KafkaProducer stopped.")

    # ------------------------------------------------------------------
    # Public publish helpers
    # ------------------------------------------------------------------

    async def publish_resume_job(self, msg: ResumeJobMessage) -> None:
        """
        Publish a resume parse job to the `resume-processing` topic.

        Partition key = task_id (UUID string encoded as UTF-8 bytes).
        This gives uniform distribution because UUIDs are random.
        """
        await self._publish(Topics.RESUME_PROCESSING.name, msg)

    async def publish_dead_letter_job(self, msg: ResumeJobMessage) -> None:
        """Publish a terminally failed resume job to the DLQ topic."""
        await self._publish(Topics.RESUME_PROCESSING_DLQ.name, msg)

    async def _publish(self, topic: str, msg: ResumeJobMessage) -> None:
        if self._producer is None:
            raise RuntimeError("KafkaProducerClient is not started. Call start() first.")

        key = msg.task_id.encode("utf-8")
        value = json.dumps(asdict(msg)).encode("utf-8")

        record_metadata = await self._producer.send_and_wait(
            topic=topic,
            key=key,
            value=value,
        )
        logger.debug(
            "Published Kafka message | topic=%s partition=%d offset=%d task_id=%s retry_count=%d",
            record_metadata.topic,
            record_metadata.partition,
            record_metadata.offset,
            msg.task_id,
            msg.retry_count,
        )


# ---------------------------------------------------------------------------
# Module-level singleton + FastAPI dependency
# ---------------------------------------------------------------------------

# Single instance shared across the whole application.
kafka_producer = KafkaProducerClient()


async def get_kafka_producer() -> KafkaProducerClient:
    """FastAPI dependency that yields the shared producer instance."""
    return kafka_producer
