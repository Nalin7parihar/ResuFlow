# Operations

## Environment Variables

Defined in `core/settings.py` and loaded from `.env`.

- `DB_URL`: async PostgreSQL connection string
- `SECRET_KEY`: JWT signing secret
- `ALGORITHM`: JWT algorithm
- `ACCESS_TOKEN_EXPIRE_MINUTES`: token lifetime, defaults to 7 days
- `KAFKA_BOOTSTRAP_SERVERS`: Kafka broker address, defaults to `localhost:9092`
- `KAFKA_GROUP_ID`: consumer group name, defaults to `resuflow-workers`
- `RESUME_MAX_RETRIES`: maximum number of worker retry attempts before DLQ routing, defaults to `3`
- `HOST`: FastAPI bind host, defaults to `localhost`
- `PORT`: FastAPI bind port, defaults to `8000`

## Local Run Order

1. Start Kafka with `docker-compose up -d`.
2. Create topics with `python -m mq.topics`.
3. Start the API with `python main.py` or `uvicorn main:app --reload`.
4. Start the worker with `python -m mq.worker`.

## Kafka Administration

- `mq/topics.py` idempotently creates the required topic.
- `mq/config.py` is the source of truth for topic names, retry-related message fields, and partition counts.
- `mq/producer.py` publishes resume jobs from the API process.
- `mq/consumer.py` consumes messages from the worker process.
- `mq/worker.py` increments retry counts, republishes failures, and sends exhausted jobs to the DLQ.

## Storage Behavior

- Uploaded files are stored in `uploads/<user_id>/`.
- The API creates the upload directory automatically.
- The worker reads the saved file directly from disk when processing the job.

## Startup Behavior

- The database tables are created automatically during app startup through `init_db()`.
- The shared Kafka producer is started and stopped with the FastAPI lifespan.
- The worker should be stopped separately and does not run inside the web app process.

## Operational Notes

- The codebase currently uses direct table creation rather than migrations.
- The consumer is at-least-once, so the worker is written to be idempotent.
- Each failed worker attempt increments `tasks.retry_count`; once the configured retry limit is exceeded, the job is published to `resume-processing-dlq`.
- The current local compose file provides Kafka and Kafka UI, but not PostgreSQL.