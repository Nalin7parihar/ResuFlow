# Documentation Index

Project documentation for the ResuFlow monorepo.

## Read First

- [Architecture](architecture.md)
- [API Reference](api.md)
- [Data Models](data-models.md)
- [Operations](operations.md)
- [Project Structure](project-structure.md)

## Scope

The docs cover the full-stack implementation:

### Backend (`backend/`)

- FastAPI application entrypoint in `main.py`
- API routes in `api/v1/endpoints/`
- SQLAlchemy models in `model/`
- Pydantic schemas in `schema/`
- Service layer in `services/`:
  - `auth_service.py` — registration and login
  - `user_service.py` — user CRUD
  - `resume_service.py` — upload orchestration and task lookups
  - `resume_parser.py` — raw text extraction (PDF, DOCX, TXT) and regex field extraction
  - `llm_parser.py` — Gemini-powered structured resume extraction (LangChain)
  - `embedding_service.py` — sentence-transformers embeddings stored in pgvector
  - `resume_analyzer.py` — RAG analysis pipeline (retrieve → Gemini → score/feedback)
- Kafka pipeline in `mq/` — producer, consumer, worker, topic admin, DLQ
- Database in `db/database.py` — async SQLAlchemy engine and session
- Configuration in `core/settings.py` — Pydantic settings from `.env`

### Frontend (`frontend/`)

- React + Vite + TypeScript + Tailwind CSS
- Development proxy to backend API at `localhost:8000`

### Infrastructure

- `docker-compose.yml` (root) — Kafka (KRaft mode) + Kafka UI
- `backend/Dockerfile` — production container for FastAPI
- `frontend/Dockerfile` — multi-stage build with Nginx

## Notes

- PostgreSQL with pgvector extension is required for both relational data and vector search.
- Kafka (KRaft mode, no ZooKeeper) handles async job processing.
- The worker is a separate process and must be run independently from the web API.
- Database tables are created on application startup via `init_db()`.
- The `resume_embeddings` pgvector table is auto-provisioned by langchain-postgres on first use.