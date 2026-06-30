#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# start_worker.sh — Start the ResuFlow Kafka consumer worker
# ──────────────────────────────────────────────────────────────
# Usage:  ./start_worker.sh
#
# Activates the virtual environment, brings up the Kafka broker
# via Docker Compose (if not already running), and launches the
# Kafka consumer worker that processes resume parse + RAG
# analysis jobs.
#
# The worker pipeline:
#   1. Parse resume (Gemini / regex fallback)
#   2. Store embedding in pgvector
#   3. RAG analysis (retrieve → Gemini → score, feedback, suggestions)
#   4. Save results to PostgreSQL
# ──────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Activate virtual environment ──────────────────────────────
if [ ! -d ".venv" ]; then
    echo "❌  Virtual environment not found. Run 'uv sync' first."
    exit 1
fi
source .venv/bin/activate

# ── Start Kafka via Docker Compose (idempotent) ──────────────
echo "🐳  Ensuring Kafka is running…"
docker compose up -d kafka 2>/dev/null || docker-compose up -d kafka 2>/dev/null || {
    echo "⚠️   Could not start Kafka via Docker Compose."
    echo "    Make sure Docker is running and docker-compose.yml exists."
    exit 1
}

# ── Wait for Kafka to be healthy ──────────────────────────────
echo "⏳  Waiting for Kafka broker to be ready…"
RETRIES=30
until docker exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list &>/dev/null; do
    RETRIES=$((RETRIES - 1))
    if [ "$RETRIES" -le 0 ]; then
        echo "❌  Kafka did not become ready in time."
        exit 1
    fi
    sleep 2
done
echo "✅  Kafka is ready."

# ── Provision topics (idempotent) ─────────────────────────────
echo "📋  Provisioning Kafka topics…"
python -m mq.topics 2>/dev/null || echo "⚠️   Topic provisioning skipped"

# ── Start the consumer worker ─────────────────────────────────
echo ""
echo "⚙️   Starting Kafka consumer worker…"
echo "    → Consumer group: resuflow-workers"
echo "    → Topic: resume-processing"
echo "    → Pipeline: Parse → Embed → RAG Analysis → Save"
echo ""
exec python -m mq.worker
