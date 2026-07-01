# Architecture

ResuFlow uses an event-driven architecture with a split between the HTTP API, the Kafka worker, and an AI processing pipeline.

## High-Level Flow

```text
                                    ┌──────────┐
Client ──► FastAPI ──► PostgreSQL   │  pgvector │
                  └──► Kafka topic: resume-processing
                            │
                            ▼
                        ┌────────────────────────────────────────┐
                        │             Kafka Worker               │
                        │                                        │
                        │  1. Parse    (Gemini / regex fallback) │
                        │  2. Embed    (MiniLM → pgvector)       │
                        │  3. Analyse  (RAG → Gemini scoring)    │
                        │  4. Save     (PostgreSQL)              │
                        └───────┬────────────────────────────────┘
                                │
                                ├──► PostgreSQL (resume_results)
                                ├──► pgvector  (resume_embeddings)
                                └──► Kafka DLQ (resume-processing-dlq)
```

## Components

### HTTP API (`backend/`)

- `main.py` — FastAPI app, database init on startup, shared Kafka producer lifespan.
- `api/v1/endpoints/auth.py` — registration and login (JWT).
- `api/v1/endpoints/users.py` — user CRUD and authenticated profile access.
- `api/v1/endpoints/resumes.py` — file upload, task polling, and result retrieval.
- `services/resume_service.py` — writes files to disk, creates task rows, publishes Kafka jobs.
- `core/security.py` — password hashing (bcrypt), JWT creation and validation (python-jose).
- `core/settings.py` — Pydantic settings loaded from `.env`.
- `db/database.py` — async SQLAlchemy engine, session factory, and `init_db()`.

### AI Pipeline (Worker-side)

- `services/llm_parser.py` — **LLM Structured Extraction**: uses LangChain + Google Gemini with structured output binding to extract name, email, phone, skills, experience, summary, education, and work experience from resume text. Falls back to the regex parser on failure.
- `services/resume_parser.py` — **Raw Text Extraction**: reads PDF (PyMuPDF), DOCX (python-docx), and TXT files. Also contains the legacy regex field extractor used as the LLM fallback.
- `services/embedding_service.py` — **Vector Embeddings**: generates 384-dim embeddings using sentence-transformers (`all-MiniLM-L6-v2`) running locally on CPU. Stores and retrieves vectors via `langchain-postgres` PGVectorStore backed by pgvector.
- `services/resume_analyzer.py` — **RAG Analysis**: queries pgvector for the resume embedding, augments a prompt with the retrieved content, and sends it to Gemini for a comprehensive structured evaluation (overall score, per-section feedback, actionable suggestions, ATS tips, missing keywords).

### Message Queue (`mq/`)

- `mq/config.py` — topic names, partition counts, message schemas (`ResumeJobMessage`).
- `mq/producer.py` — async Kafka producer (idempotent, `acks=all`), publishes resume jobs and DLQ messages.
- `mq/consumer.py` — async Kafka consumer with manual offset commit.
- `mq/worker.py` — standalone process that orchestrates the full pipeline: parse → embed → analyse → save.
- `mq/topics.py` — idempotent topic provisioning script.

### Frontend (`frontend/`)

- React + Vite + TypeScript + Tailwind CSS.
- Vite dev server proxies `/api` requests to the backend at `localhost:8000`.

## Request and Processing Lifecycle

1. The client authenticates and receives a JWT bearer token.
2. The upload endpoint validates the file extension (`.pdf`, `.docx`, `.txt`) and stores the file under `uploads/<user_id>/`.
3. A `Task` row is created with status `queued`.
4. A Kafka message is published to `resume-processing` using the task ID as the message key.
5. The worker consumes the message and marks the task `processing`.
6. **Parse**: The worker reads the file from disk and extracts structured data via Gemini (with regex fallback).
7. **Persist**: A `ResumeResult` row is inserted with parsed fields.
8. **Embed**: The raw resume text is embedded with MiniLM and stored in pgvector via `resume_embeddings`.
9. **Analyse**: The RAG pipeline retrieves the embedding from pgvector, augments a Gemini prompt, and generates a comprehensive analysis (score, feedback, suggestions, ATS tips).
10. **Update**: The `ResumeResult` row is updated with analysis fields.
11. The task is marked `completed`.
12. If any critical step fails, the worker increments `retry_count`, republishes the job until `RESUME_MAX_RETRIES` is exceeded, then marks the task `failed` and routes it to `resume-processing-dlq`.

## Kafka Design

- **Primary topic**: `resume-processing` (3 partitions).
- **Dead-letter topic**: `resume-processing-dlq`.
- **Producer**: idempotent with `acks=all`.
- **Consumer**: manual offset commit — offsets are only acknowledged after successful DB writes.
- **Delivery guarantee**: at-least-once. The worker is idempotent (skips already-completed tasks).
- **Retry tracking**: `tasks.retry_count` incremented on each failure; capped by `RESUME_MAX_RETRIES`.
- **Scaling**: start up to 3 worker instances (matching partition count) — Kafka automatically distributes partitions.

## AI/ML Stack

| Component | Technology | Details |
|---|---|---|
| LLM Provider | Google Gemini | Structured output via LangChain bindings |
| Embedding Model | `all-MiniLM-L6-v2` | 384-dim, runs locally on CPU via sentence-transformers |
| Vector Store | pgvector | PostgreSQL extension, managed via `langchain-postgres` PGVectorStore |
| Orchestration | LangChain | `langchain-core`, `langchain-google-genai`, `langchain-huggingface`, `langchain-postgres` |

## Persistence Model

- `users` — account information (email, hashed password).
- `tasks` — processing state, input file location, retry count, failure details.
- `resume_results` — parsed fields (name, email, phone, skills, experience, summary, education, work experience), embedding vector, and RAG analysis results (overall score, verdict, section feedback, suggestions, ATS tips, missing keywords).
- `resume_embeddings` — pgvector table managed by `langchain-postgres` for similarity search.

## What Is Not Present

- Redis is not used in the current implementation.
- Alembic migrations are not present; tables are created directly at startup.
- Kubernetes manifests are not yet included.