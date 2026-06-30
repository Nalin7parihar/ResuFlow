# Project Structure

## Root Files

- `main.py`: FastAPI application entrypoint and lifespan hooks.
- `docker-compose.yml`: local Kafka and Kafka UI stack.
- `pyproject.toml`: project metadata and dependencies.
- `README.md`: top-level project summary.

## Application Packages

- `api/`: HTTP routing layer.
- `core/`: settings and authentication helpers.
- `db/`: async SQLAlchemy engine, session factory, and metadata base.
- `model/`: SQLAlchemy ORM models.
- `mq/`: Kafka config, producer, consumer, worker, and topic administration.
- `schema/`: Pydantic request and response models.
- `services/`: application service logic and parsing helpers.
- `uploads/`: saved resume files grouped by user ID.

## Module Responsibilities

- `api/v1/endpoints/auth.py`: registration and login.
- `api/v1/endpoints/users.py`: user CRUD and profile lookup.
- `api/v1/endpoints/resumes.py`: upload and task/result access.
- `services/auth_service.py`: authentication and registration workflows.
- `services/user_service.py`: user CRUD operations.
- `services/resume_service.py`: upload orchestration and task lookups.
- `services/resume_parser.py`: file text extraction and field heuristics.
- `mq/worker.py`: background parsing execution.