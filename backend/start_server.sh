#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# start_server.sh — Start the ResuFlow FastAPI server
# ──────────────────────────────────────────────────────────────
# Usage:  ./start_server.sh
#
# Activates the virtual environment and launches the FastAPI dev
# server with hot-reload on http://localhost:8000
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

# ── Provision Kafka topics (idempotent) ───────────────────────
echo "📋  Provisioning Kafka topics…"
python -m mq.topics 2>/dev/null || echo "⚠️   Topic provisioning skipped (Kafka may not be running)"

# ── Start FastAPI ─────────────────────────────────────────────
echo ""
echo "🚀  Starting ResuFlow API server…"
echo "    → http://localhost:8000"
echo "    → Docs: http://localhost:8000/docs"
echo ""
exec python main.py
