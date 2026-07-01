# ── Backend Dockerfile ───────────────────────────────────────
# Multi-stage build for the ResuFlow FastAPI backend.
#
# Build:  docker build -t resuflow-backend ./backend
# Run:    docker run --env-file backend/.env -p 8000:8000 resuflow-backend
# ─────────────────────────────────────────────────────────────

FROM python:3.13-slim AS base

WORKDIR /app

# System dependencies for psycopg (PostgreSQL) and PyMuPDF
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency manifests first (Docker cache layer)
COPY pyproject.toml uv.lock ./

# Install dependencies (no dev deps in prod)
RUN uv sync --frozen --no-dev

# Copy application source
COPY . .

# Expose the API port
EXPOSE 8000

# Run the FastAPI server
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
