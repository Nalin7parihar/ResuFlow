# Operations

## Environment Variables

Defined in `backend/core/settings.py` and loaded from `backend/.env`.

### Core

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_URL` | ✅ | — | Async PostgreSQL connection string |
| `SECRET_KEY` | ✅ | — | JWT signing secret |
| `ALGORITHM` | ✅ | — | JWT algorithm (e.g., `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | — | `10080` | Token lifetime (7 days) |
| `HOST` | — | `localhost` | FastAPI bind host |
| `PORT` | — | `8000` | FastAPI bind port |

### Kafka

| Variable | Required | Default | Description |
|---|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | — | `localhost:9092` | Kafka broker address |
| `KAFKA_GROUP_ID` | — | `resuflow-workers` | Consumer group name |
| `RESUME_MAX_RETRIES` | — | `3` | Max retries before DLQ |

### AI / LLM

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | ✅ | — | Google Gemini API key |
| `LLM_MODEL` | — | `gemini-3.5-flash` | Gemini model name |
| `LLM_TEMPERATURE` | — | `0.0` | Temperature for parsing |
| `HF_TOKEN` | ✅ | — | Hugging Face token |
| `EMBEDDING_MODEL` | — | `sentence-transformers/all-MiniLM-L6-v2` | Embedding model |
| `EMBEDDING_DIMENSIONS` | — | `384` | Vector dimensions |

## Local Development

### 1. Infrastructure

```bash
docker-compose up -d     # Kafka (KRaft) + Kafka UI (from project root)
```

### 2. Backend

```bash
cd backend
uv sync                  # Install deps
./start_server.sh        # FastAPI on http://localhost:8000
./start_worker.sh        # Kafka worker (separate terminal)
```

### 3. Frontend

```bash
cd frontend
npm install && npm run dev   # Vite on http://localhost:5173
```

## Worker Pipeline

1. **Parse** — Gemini structured extraction (regex fallback)
2. **Save** — Insert `ResumeResult` row
3. **Embed** — MiniLM → pgvector (non-critical)
4. **Analyse** — RAG retrieval → Gemini scoring (non-critical)
5. **Update** — Enrich result, mark task `completed`

## Docker

```bash
docker build -t resuflow-backend ./backend
docker build -t resuflow-frontend ./frontend
```

## Notes

- Direct table creation (no Alembic migrations)
- At-least-once delivery; worker is idempotent
- PostgreSQL with pgvector must be run separately
- Embeddings run locally on CPU