"""
mq/consumer.py
--------------
Async Kafka consumer client for ResuFlow.

This module provides the `KafkaConsumerClient` class which is used by the
worker entry-point (`mq/worker.py`).  It is intentionally decoupled from
FastAPI — the worker runs as a standalone process, not inside the web server.

Design decisions
────────────────
• Consumer group `resuflow-workers` — Kafka assigns partitions across all
  running instances in the group.  With 3 partitions you can scale to 3
  parallel workers with zero code changes.
• Manual offset commit (enable_auto_commit=False) — offsets are committed
  only *after* the handler coroutine succeeds, giving at-least-once delivery.
  The handler must be idempotent (the task status check in resume_service
  already guards against double-processing).
• `auto_offset_reset="earliest"` — a freshly deployed worker picks up any
  messages produced before it started (useful for cold starts and rollouts).
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Callable, Coroutine
from typing import Any

from aiokafka import AIOKafkaConsumer, ConsumerRecord

from core.settings import settings
from mq.config import ResumeJobMessage, Topics

logger = logging.getLogger(__name__)

# Type alias for the handler coroutine the worker passes in.
MessageHandler = Callable[[ResumeJobMessage], Coroutine[Any, Any, None]]


class KafkaConsumerClient:
    """
    Async wrapper around AIOKafkaConsumer.

    Typical usage in the worker:
        client = KafkaConsumerClient()
        await client.start()
        try:
            await client.consume_resume_jobs(handler)
        finally:
            await client.stop()
    """

    def __init__(self) -> None:
        self._consumer: AIOKafkaConsumer | None = None
        self._running = False

    async def start(self) -> None:
        """Connect to Kafka and join the consumer group."""
        self._consumer = AIOKafkaConsumer(
            Topics.RESUME_PROCESSING.name,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=settings.KAFKA_GROUP_ID,
            client_id="resuflow-worker",
            auto_offset_reset="earliest",
            enable_auto_commit=False,
            # Decode keys as UTF-8 strings; values stay as bytes for manual JSON parsing.
            key_deserializer=lambda k: k.decode("utf-8") if k else None,
            # Heartbeat every 3 s — keeps the consumer in the group during slow processing.
            heartbeat_interval_ms=3_000,
            # Allow up to 5 minutes for a single resume to process before a rebalance.
            max_poll_interval_ms=300_000,
            session_timeout_ms=30_000,
        )
        await self._consumer.start()
        self._running = True
        logger.info(
            "KafkaConsumer started — group=%s topic=%s bootstrap=%s",
            settings.KAFKA_GROUP_ID,
            Topics.RESUME_PROCESSING.name,
            settings.KAFKA_BOOTSTRAP_SERVERS,
        )

    async def stop(self) -> None:
        """Leave the consumer group and close the connection."""
        self._running = False
        if self._consumer:
            await self._consumer.stop()
            logger.info("KafkaConsumer stopped.")

    # ------------------------------------------------------------------
    # Poll loop
    # ------------------------------------------------------------------

    async def consume_resume_jobs(self, handler: MessageHandler) -> None:
        """
        Poll the `resume-processing` topic indefinitely, calling `handler`
        for each message.

        Offset is committed after a successful handler call (at-least-once).
        On handler failure the offset is NOT committed so the message will be
        redelivered on the next poll cycle.

        Stop the loop by calling `stop()` from another coroutine / signal handler.
        """
        if self._consumer is None:
            raise RuntimeError("KafkaConsumerClient is not started. Call start() first.")

        logger.info("Starting resume-job poll loop…")

        async for record in self._consumer:
            if not self._running:
                break

            msg = self._deserialise(record)
            if msg is None:
                # Malformed message — commit and move on to avoid poison-pill stall.
                await self._consumer.commit()
                continue

            logger.info(
                "Received resume job | task_id=%s partition=%d offset=%d",
                msg.task_id,
                record.partition,
                record.offset,
            )

            try:
                await handler(msg)
                # Commit only after successful processing.
                await self._consumer.commit()
                logger.info("Committed offset %d (task_id=%s)", record.offset, msg.task_id)
            except asyncio.CancelledError:
                # Worker is shutting down — do not commit so the message is retried.
                logger.warning("Processing cancelled for task_id=%s — offset NOT committed", msg.task_id)
                raise
            except Exception as exc:
                # Log the error but don't crash the loop — the message will be
                # retried on the next poll (offset not committed).
                logger.error(
                    "Handler failed for task_id=%s: %s — will retry on next poll",
                    msg.task_id,
                    exc,
                    exc_info=True,
                )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _deserialise(record: ConsumerRecord) -> ResumeJobMessage | None:
        """Parse raw Kafka record bytes into a ResumeJobMessage."""
        try:
            payload: dict = json.loads(record.value.decode("utf-8"))
            return ResumeJobMessage(
                task_id=payload["task_id"],
                user_id=payload["user_id"],
                file_path=payload["file_path"],
                file_extension=payload["file_extension"],
                retry_count=payload.get("retry_count", 0),
                error_message=payload.get("error_message"),
            )
        except Exception as exc:
            logger.error(
                "Failed to deserialise message at partition=%d offset=%d: %s",
                record.partition,
                record.offset,
                exc,
            )
            return None
