# ResuFlow

ResuFlow is an AI-powered resume processing platform built as a full-stack monorepo. The backend handles asynchronous resume parsing, vector embedding, and RAG-based analysis through a FastAPI + Kafka + PostgreSQL pipeline. The frontend (React + TypeScript + Tailwind CSS) provides the user interface.

## Monorepo Layout

```
ResuFlow/
├── backend/          Python — FastAPI, Kafka worker, AI pipeline
├── frontend/         React + Vite + TypeScript + Tailwind CSS
├── docs/             Project-wide documentation
└── docker-compose.yml   Shared infrastructure (Kafka, Kafka UI)
```

## Key Features

- **JWT Authentication** — Registration, login, and token-protected routes
- **Async Resume Processing** — Upload → Kafka queue → Worker pipeline
- **LLM Resume Parsing** — Gemini-powered structured extraction with regex fallback
- **Vector Embeddings** — sentence-transformers MiniLM stored in pgvector
- **RAG Analysis** — Retrieve resume from pgvector → Gemini generates score, feedback, suggestions, and ATS tips
- **Dead-Letter Queue** — Failed jobs retry up to a configurable limit, then route to DLQ

## Project Documentation

- [Documentation Index](docs/README.md)
- [Architecture](docs/architecture.md)
- [API Reference](docs/api.md)
- [Data Models](docs/data-models.md)
- [Operations](docs/operations.md)
- [Project Structure](docs/project-structure.md)

## Quick Start

### Prerequisites

- Python 3.13+ and [uv](https://github.com/astral-sh/uv)
- Node.js 22+ and npm
- Docker (for Kafka)
- PostgreSQL with pgvector extension

### Backend

```bash
cd backend
cp .env.example .env   # fill in DB_URL, SECRET_KEY, GOOGLE_API_KEY, etc.
uv sync                # install dependencies + create .venv
./start_server.sh      # start FastAPI (provisions Kafka topics automatically)
./start_worker.sh      # start Kafka worker (in a second terminal)
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # Vite dev server at http://localhost:5173
```

### Infrastructure

```bash
docker-compose up -d   # Kafka + Kafka UI (from project root)
```

## Request Flow

1. Client registers or logs in → receives JWT access token.
2. Client uploads resume → API saves file, creates task, publishes Kafka message.
3. Worker consumes message → LLM parses resume → stores embedding in pgvector → RAG analysis via Gemini.
4. Worker saves `ResumeResult` (parsed data + analysis) and marks task `completed`.
5. If processing fails → retry up to `RESUME_MAX_RETRIES`, then route to DLQ.
6. Client polls task status and fetches the full result when complete.

## License

This project is licensed under the MIT License.
