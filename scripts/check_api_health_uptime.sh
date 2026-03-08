#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${HEALTH_BASE_URL:-http://127.0.0.1:8000}}"
HEALTH_URL="${BASE_URL%/}/health"
TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-5}"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required." >&2
  exit 1
fi

PYTHON_BIN="python3"
if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  echo "ERROR: python3 or python is required." >&2
  exit 1
fi

health_payload="$(curl --fail --silent --show-error --max-time "${TIMEOUT_SECONDS}" "${HEALTH_URL}")"

"${PYTHON_BIN}" - "${health_payload}" "${HEALTH_URL}" <<'PY'
import json
import sys
from datetime import datetime

payload = json.loads(sys.argv[1])
health_url = sys.argv[2]

status = payload.get("status")
if status != "ok":
    print(f"ERROR: {health_url} returned status={status!r}", file=sys.stderr)
    raise SystemExit(2)

uptime_seconds = payload.get("uptime_seconds")
if not isinstance(uptime_seconds, (int, float)) or uptime_seconds < 0:
    print("ERROR: uptime_seconds is missing or invalid.", file=sys.stderr)
    raise SystemExit(3)

started_at_utc = payload.get("started_at_utc")
if not isinstance(started_at_utc, str):
    print("ERROR: started_at_utc is missing or invalid.", file=sys.stderr)
    raise SystemExit(4)

try:
    datetime.fromisoformat(started_at_utc.replace("Z", "+00:00"))
except ValueError as exc:
    print(f"ERROR: invalid started_at_utc value: {exc}", file=sys.stderr)
    raise SystemExit(5) from exc

app_name = payload.get("app_name", "unknown")
environment = payload.get("environment", "unknown")
version = payload.get("version", "unknown")

print(
    "health=ok "
    f"app_name={app_name!s} "
    f"environment={environment!s} "
    f"version={version!s} "
    f"uptime_seconds={float(uptime_seconds):.3f} "
    f"started_at_utc={started_at_utc}"
)
PY
