# Observability and Logs (Task H1)

Project Lunar now emits structured JSON logs for every HTTP request and exposes
startup/uptime metadata from `/health`.

## Structured Request Logs

Request logs are emitted from backend middleware under logger `project_lunar.api`.
Each request writes one `http_request` event with fields:

- `timestamp_utc`
- `level`
- `logger`
- `message`
- `event`
- `request_id`
- `method`
- `path`
- `status_code`
- `duration_ms`
- `client_ip`
- `host`
- `user_agent`

Additional exception events:

- `unhandled_exception` for unexpected runtime failures
- `api_error`, `http_exception`, and `request_validation_error` for handled failures

Every response includes `X-Request-ID` so logs can be correlated with client requests.

## Health + Uptime Visibility

`GET /health` now returns:

- `status`
- `app_name`
- `environment`
- `version`
- `started_at_utc`
- `uptime_seconds`

## Health/Uptime Check Script

Use the script from repo root:

```bash
./scripts/check_api_health_uptime.sh
```

Optional custom base URL:

```bash
./scripts/check_api_health_uptime.sh http://127.0.0.1:8000
```

Expected output format:

```text
health=ok app_name=Project Lunar API environment=development version=0.1.0 uptime_seconds=12.345 started_at_utc=2026-03-08T01:23:45Z
```
