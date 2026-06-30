# Architecture

ResuFlow uses an event-driven split between the HTTP API and the resume-processing worker.

## High-Level Flow

```text
Client -> FastAPI -> PostgreSQL
                   -> Kafka topic: resume-processing -> Worker -> PostgreSQL
                                                     -> Kafka topic: resume-processing-dlq
```

## Components

- `main.py` creates the FastAPI app, initializes database tables on startup, and starts the shared Kafka producer during lifespan startup.
- `api/v1/endpoints/auth.py` handles registration and login.
- `api/v1/endpoints/users.py` handles user CRUD operations and authenticated profile access.
- `api/v1/endpoints/resumes.py` handles file upload, task polling, and result retrieval.
- `services/resume_service.py` writes uploaded files to disk, creates task rows, and publishes Kafka jobs.
- `mq/worker.py` consumes jobs, parses resumes, and writes parsed results.
- `db/database.py` provides the async SQLAlchemy engine and session factory.
- `core/security.py` provides password hashing, JWT creation, and JWT validation.

## Request and Processing Lifecycle

1. The client authenticates and receives a bearer token.
2. The upload endpoint validates the file extension and stores the file under `uploads/<user_id>/`.
3. A `Task` row is created with status `queued`.
4. A Kafka message is published to `resume-processing` using the task ID as the message key.
5. The worker consumes the message, marks the task `processing`, reads the file, and parses the resume.
6. The worker stores a `ResumeResult` row and marks the task `completed`.
7. If parsing or file reading fails, the worker increments `retry_count`, republishes the job with the updated retry count until `RESUME_MAX_RETRIES` is exceeded, and then marks the task `failed` and publishes the job to `resume-processing-dlq`.

## Kafka Design

- The topic name is `resume-processing`.
- The dead-letter topic name is `resume-processing-dlq`.
- The topic is configured with 3 partitions in the local topic definition.
- The producer uses idempotent sends with `acks=all`.
- The consumer uses manual offset commit so offsets are only acknowledged after successful processing.
- The worker is designed for at-least-once delivery and idempotent reprocessing.
- The worker tracks retry attempts in `tasks.retry_count` and caps retries with `RESUME_MAX_RETRIES`.

## Persistence Model

- `users` stores account information.
- `tasks` stores processing state, input file location, retry count, and failure details.
- `resume_results` stores extracted fields and the raw parsed text.

## What Is Not Present

- Redis is not used in the current implementation.
- Alembic migrations are not present; tables are created directly at startup.