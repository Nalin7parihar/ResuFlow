# Project Structure

## Root

- `docker-compose.yml` — local Kafka (KRaft) + Kafka UI stack
- `README.md` — top-level monorepo summary
- `.gitignore` — ignore patterns for both Python and Node.js

## Backend (`backend/`)

### Entrypoint & Config

- `main.py` — FastAPI app, lifespan hooks (DB init, Kafka producer)
- `pyproject.toml` — project metadata and Python dependencies
- `uv.lock` — locked dependency versions
- `.python-version` — Python 3.13
- `.env` — environment variables (not committed)
- `start_server.sh` — FastAPI startup script
- `start_worker.sh` — Kafka worker startup script
- `Dockerfile` — production container (uv + uvicorn)

### Application Packages

- `api/` — HTTP routing layer
  - `api/v1/router.py` — versioned API router
  - `api/v1/endpoints/auth.py` — registration and login
  - `api/v1/endpoints/users.py` — user CRUD and profile lookup
  - `api/v1/endpoints/resumes.py` — upload, task polling, result access
- `core/` — settings and authentication
  - `core/settings.py` — Pydantic settings (loaded from `.env`)
  - `core/security.py` — password hashing, JWT creation/validation
- `db/` — database layer
  - `db/database.py` — async SQLAlchemy engine, session factory, `init_db()`
- `model/` — SQLAlchemy ORM models
  - `model/user.py` — `users` table
  - `model/task.py` — `tasks` table
  - `model/resume_result.py` — `resume_results` table (parsed + embedding + analysis)
- `mq/` — Kafka infrastructure
  - `mq/config.py` — topic names, message schemas
  - `mq/producer.py` — async Kafka producer (idempotent, acks=all)
  - `mq/consumer.py` — async Kafka consumer (manual commit)
  - `mq/worker.py` — standalone worker: parse → embed → analyse → save
  - `mq/topics.py` — idempotent topic provisioning
- `schema/` — Pydantic request/response models
  - `schema/auth.py` — LoginRequest, TokenResponse
  - `schema/user.py` — UserCreate, UserUpdate, UserResponse
  - `schema/task.py` — task status enum, TaskResponse
  - `schema/resume_result.py` — ResumeResultCreate, ResumeResultResponse
- `services/` — business logic
  - `services/auth_service.py` — authentication workflows
  - `services/user_service.py` — user CRUD operations
  - `services/resume_service.py` — upload orchestration, task lookups
  - `services/resume_parser.py` — raw text extraction (PDF/DOCX/TXT) + regex fallback
  - `services/llm_parser.py` — Gemini structured extraction via LangChain
  - `services/embedding_service.py` — MiniLM embeddings + pgvector storage
  - `services/resume_analyzer.py` — RAG analysis (retrieve → Gemini → score/feedback)
- `uploads/` — saved resume files grouped by user ID

## Frontend (`frontend/`)

- `src/` — React + TypeScript source code
- `public/` — static assets
- `vite.config.ts` — Vite config with Tailwind CSS plugin and API proxy
- `tsconfig.json` — TypeScript configuration
- `package.json` — Node.js dependencies
- `Dockerfile` — multi-stage build (Node build → Nginx serve)

## Documentation (`docs/`)

- `README.md` — documentation index
- `architecture.md` — system design and component overview
- `api.md` — HTTP API reference
- `data-models.md` — database schema and Pydantic models
- `operations.md` — environment variables, setup, and operations
- `project-structure.md` — this file