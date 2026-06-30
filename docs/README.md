# Documentation Index

This directory contains the project documentation generated from the current codebase scan.

## Read First

- [Architecture](architecture.md)
- [API Reference](api.md)
- [Data Models](data-models.md)
- [Operations](operations.md)
- [Project Structure](project-structure.md)

## Scope

The docs reflect the implementation in this repository at scan time:

- FastAPI application entrypoint in `main.py`
- API routes in `api/v1/endpoints/`
- SQLAlchemy models in `model/`
- Schemas in `schema/`
- Services in `services/`
- Kafka producer, consumer, worker, and topic administration in `mq/`
- Database setup in `db/database.py`
- Runtime configuration in `core/settings.py`

## Notes

- The current code uses PostgreSQL and Kafka, including a `resume-processing-dlq` topic for exhausted jobs.
- Database tables are created on application startup through `init_db()`.
- The worker is a separate process and should be run independently from the web API.