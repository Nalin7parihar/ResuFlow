# ResuFlow

ResuFlow is an asynchronous resume processing pipeline built with FastAPI, PostgreSQL, and Kafka. The API accepts uploaded resumes, records a processing task, publishes a Kafka job, and returns immediately. A separate worker consumes the job, retries failed work up to a configurable limit, and routes exhausted jobs to a dead-letter queue after incrementing the task retry counter.

## What’s Included

- FastAPI REST API with JWT authentication
- PostgreSQL-backed users, tasks, and parsed resume results
- Kafka producer, consumer, standalone worker process, and DLQ topic
- Resume parsing for `.pdf`, `.docx`, and `.txt` uploads
- Local Kafka stack with Docker Compose

## Project Docs

- [Documentation Index](docs/README.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Data Models](docs/data-models.md)
- [Operations](docs/operations.md)
- [Project Structure](docs/project-structure.md)

## Quick Start

1. Create a `.env` file with `DB_URL`, `SECRET_KEY`, `ALGORITHM`, and optionally `RESUME_MAX_RETRIES`, plus any Kafka overrides you need.
2. Start Kafka with `docker-compose up -d`.
3. Create the Kafka topic with `python -m mq.topics`.
4. Start the API with `python main.py` or `uvicorn main:app --reload`.
5. Start the worker with `python -m mq.worker`.

## Request Flow

1. A client registers or logs in and receives a JWT access token.
2. The client uploads a resume to `POST /api/v1/resumes/upload`.
3. The API stores the file under `uploads/<user_id>/`, creates a queued task, and publishes a Kafka message.
4. The worker reads the file, extracts candidate fields, stores the parsed result, and marks the task completed.
5. If a parse or file-read step fails, the worker increments `retry_count`, republishes the job until the retry limit is reached, and then sends the job to `resume-processing-dlq`.
6. The client polls task status and fetches the parsed result when the task is complete.

## License

This project is licensed under the MIT License.
