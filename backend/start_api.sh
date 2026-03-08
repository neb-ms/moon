#!/usr/bin/env bash
set -euo pipefail

HOST="${LUNAR_API_HOST:-127.0.0.1}"
PORT="${LUNAR_API_PORT:-8000}"
WORKERS="${LUNAR_API_WORKERS:-1}"
LOG_LEVEL="${LUNAR_LOG_LEVEL:-info}"

exec python -m uvicorn app.main:app \
  --host "${HOST}" \
  --port "${PORT}" \
  --workers "${WORKERS}" \
  --proxy-headers \
  --forwarded-allow-ips="127.0.0.1" \
  --log-level "${LOG_LEVEL}"
