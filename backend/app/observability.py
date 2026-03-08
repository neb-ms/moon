from __future__ import annotations

import json
import logging
import sys
import time
from datetime import UTC, datetime
from uuid import uuid4

from starlette.datastructures import Headers, MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

LOG_EXTRA_FIELDS = (
    "event",
    "request_id",
    "method",
    "path",
    "status_code",
    "duration_ms",
    "client_ip",
    "host",
    "user_agent",
    "error_code",
)


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp_utc": datetime.fromtimestamp(record.created, tz=UTC)
            .isoformat(timespec="milliseconds")
            .replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        for key in LOG_EXTRA_FIELDS:
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, separators=(",", ":"), ensure_ascii=True)


def configure_observability_logger(log_level: str) -> logging.Logger:
    logger = logging.getLogger("project_lunar.api")
    normalized_level = getattr(logging, str(log_level).upper(), logging.INFO)
    logger.setLevel(normalized_level)

    if not getattr(logger, "_lunar_structured", False):
        stream_handler = logging.StreamHandler(sys.stdout)
        stream_handler.setFormatter(JsonLogFormatter())
        stream_handler.setLevel(normalized_level)
        logger.handlers = [stream_handler]
        logger.propagate = False
        logger._lunar_structured = True
    else:
        for handler in logger.handlers:
            handler.setLevel(normalized_level)

    return logger


class RequestLoggingMiddleware:
    def __init__(self, app: ASGIApp, *, logger: logging.Logger) -> None:
        self.app = app
        self.logger = logger

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started_at = time.perf_counter()
        headers = Headers(scope=scope)
        request_id = _extract_request_id(headers)
        method = str(scope.get("method", ""))
        path = str(scope.get("path", ""))
        host = _extract_host(headers)
        user_agent = headers.get("user-agent")
        client_ip = _extract_client_ip(scope, headers)
        scope["lunar_request_id"] = request_id
        status_code = 500

        async def send_with_request_id(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = int(message.get("status", 500))
                response_headers = MutableHeaders(scope=message)
                response_headers["X-Request-ID"] = request_id
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception:
            duration_ms = round((time.perf_counter() - started_at) * 1000.0, 3)
            self.logger.exception(
                "Request handling crashed before a response could be returned.",
                extra={
                    "event": "http_request_crash",
                    "request_id": request_id,
                    "method": method,
                    "path": path,
                    "status_code": 500,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                    "host": host,
                    "user_agent": user_agent,
                },
            )
            raise

        duration_ms = round((time.perf_counter() - started_at) * 1000.0, 3)
        level = logging.INFO
        if status_code >= 500:
            level = logging.ERROR
        elif status_code >= 400:
            level = logging.WARNING

        self.logger.log(
            level,
            "HTTP request completed.",
            extra={
                "event": "http_request",
                "request_id": request_id,
                "method": method,
                "path": path,
                "status_code": status_code,
                "duration_ms": duration_ms,
                "client_ip": client_ip,
                "host": host,
                "user_agent": user_agent,
            },
        )


def _extract_request_id(headers: Headers) -> str:
    raw_request_id = headers.get("x-request-id", "").strip()
    if raw_request_id and len(raw_request_id) <= 128:
        return raw_request_id
    return str(uuid4())


def _extract_host(headers: Headers) -> str:
    return headers.get("host", "")


def _extract_client_ip(scope: Scope, headers: Headers) -> str:
    forwarded_for = headers.get("x-forwarded-for")
    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip

    client = scope.get("client")
    if client and client[0]:
        return str(client[0])

    return "unknown"
