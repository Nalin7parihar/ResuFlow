"""
mq/topics.py
------------
Admin script — idempotently creates all ResuFlow Kafka topics.

Run once before starting the app or worker:
    python -m mq.topics

Safe to re-run; topics that already exist are silently skipped.
Uses aiokafka's AIOKafkaAdminClient (fully compatible with Kafka 4.x).
"""

from __future__ import annotations

import asyncio
import logging

from aiokafka.admin import AIOKafkaAdminClient, NewTopic
from aiokafka.errors import TopicAlreadyExistsError

from core.settings import settings
from mq.config import Topics

logger = logging.getLogger(__name__)


async def create_topics() -> None:
    """Create all application topics if they do not already exist."""
    admin = AIOKafkaAdminClient(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        client_id="resuflow-admin",
    )
    await admin.start()

    try:
        new_topics = [
            NewTopic(
                name=topic.name,
                num_partitions=topic.partitions,
                replication_factor=topic.replication_factor,
            )
            for topic in Topics.ALL
        ]

        created: list[str] = []
        skipped: list[str] = []

        for topic in new_topics:
            try:
                await admin.create_topics([topic], validate_only=False)
                created.append(topic.name)
                logger.info(
                    "Created topic '%s' (%d partition(s))",
                    topic.name,
                    topic.num_partitions,
                )
            except TopicAlreadyExistsError:
                skipped.append(topic.name)
                logger.info("Topic '%s' already exists — skipping", topic.name)
            except Exception as exc:
                logger.error("Failed to create topic '%s': %s", topic.name, exc)
                raise

        logger.info("Done. Created=%s  Skipped=%s", created, skipped)

    finally:
        await admin.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
    asyncio.run(create_topics())
