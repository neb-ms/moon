from __future__ import annotations

import math
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlsplit

from fastapi.responses import JSONResponse
from starlette.datastructures import Headers
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .schemas import ErrorBody, ErrorEnvelope


def build_error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    details: Any | None = None,
) -> JSONResponse:
    payload = ErrorEnvelope(error=ErrorBody(code=code, message=message, details=details))
    return JSONResponse(status_code=status_code, content=payload.model_dump(mode="json"))


def sanitize_validation_errors(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sanitized: list[dict[str, Any]] = []
    for error in errors:
        sanitized.append(
            {
                "type": error.get("type"),
                "loc": error.get("loc"),
                "msg": error.get("msg"),
            }
        )
    return sanitized


@dataclass(slots=True)
class _RateLimitWindow:
    started_at: float
    request_count: int


class InMemoryRateLimitStore:
    def __init__(
        self,
        *,
        max_requests: int,
        window_seconds: int,
        now_fn: Callable[[], float] | None = None,
    ) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._now_fn = now_fn or time.monotonic
        self._windows: dict[str, _RateLimitWindow] = {}
        self._lock = threading.Lock()
        self._calls_since_cleanup = 0

    def consume(self, key: str) -> tuple[bool, int]:
        now = self._now_fn()

        with self._lock:
            window = self._windows.get(key)
            if window is None or now - window.started_at >= self.window_seconds:
                window = _RateLimitWindow(started_at=now, request_count=0)
                self._windows[key] = window

            if window.request_count < self.max_requests:
                window.request_count += 1
                allowed = True
                retry_after_seconds = 0
            else:
                remaining = self.window_seconds - (now - window.started_at)
                retry_after_seconds = max(1, math.ceil(remaining))
                allowed = False

            self._calls_since_cleanup += 1
            if self._calls_since_cleanup >= 500:
                self._cleanup(now)

            return allowed, retry_after_seconds

    def _cleanup(self, now: float) -> None:
        self._calls_since_cleanup = 0
        expired_keys = [
            key
            for key, window in self._windows.items()
            if now - window.started_at >= self.window_seconds
        ]
        for key in expired_keys:
            self._windows.pop(key, None)


class RateLimitMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        *,
        store: InMemoryRateLimitStore,
        protected_path_prefixes: list[str] | None = None,
    ) -> None:
        self.app = app
        self.store = store
        self.protected_path_prefixes = protected_path_prefixes or ["/api/v1/"]

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if not any(path.startswith(prefix) for prefix in self.protected_path_prefixes):
            await self.app(scope, receive, send)
            return

        client_ip = _extract_client_ip(scope)
        allowed, retry_after = self.store.consume(client_ip)
        if allowed:
            await self.app(scope, receive, send)
            return

        response = build_error_response(
            status_code=429,
            code="rate_limited",
            message="Too many requests. Please try again later.",
            details={"retry_after_seconds": retry_after},
        )
        response.headers["Retry-After"] = str(retry_after)
        await response(scope, receive, send)


class TrustedHostGuardMiddleware:
    def __init__(self, app: ASGIApp, *, allowed_hosts: list[str]) -> None:
        self.app = app
        self.allowed_hosts = [host.lower() for host in allowed_hosts]

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        host = _extract_host_from_scope(scope)
        if not host or not _is_host_allowed(host, self.allowed_hosts):
            response = build_error_response(
                status_code=400,
                code="invalid_host",
                message="Invalid host header.",
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)


class RequestBodyTooLargeError(Exception):
    pass


class RequestSizeLimitMiddleware:
    def __init__(self, app: ASGIApp, *, max_body_bytes: int) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        content_length_header = headers.get("content-length")
        if content_length_header:
            try:
                content_length = int(content_length_header)
            except ValueError:
                response = build_error_response(
                    status_code=400,
                    code="invalid_content_length",
                    message="Invalid Content-Length header.",
                )
                await response(scope, receive, send)
                return

            if content_length > self.max_body_bytes:
                response = build_error_response(
                    status_code=413,
                    code="payload_too_large",
                    message=f"Request body exceeds {self.max_body_bytes} bytes.",
                )
                await response(scope, receive, send)
                return

        received_bytes = 0

        async def limited_receive() -> Message:
            nonlocal received_bytes
            message = await receive()
            if message["type"] != "http.request":
                return message

            body = message.get("body", b"")
            received_bytes += len(body)
            if received_bytes > self.max_body_bytes:
                raise RequestBodyTooLargeError

            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLargeError:
            response = build_error_response(
                status_code=413,
                code="payload_too_large",
                message=f"Request body exceeds {self.max_body_bytes} bytes.",
            )
            await response(scope, receive, send)


def _extract_client_ip(scope: Scope) -> str:
    headers = Headers(scope=scope)
    forwarded_for = headers.get("x-forwarded-for")
    if forwarded_for:
        first_ip = forwarded_for.split(",")[0].strip()
        if first_ip:
            return first_ip

    client = scope.get("client")
    if client and client[0]:
        return str(client[0])

    return "unknown"


def _extract_host_from_scope(scope: Scope) -> str:
    headers = Headers(scope=scope)
    host_header = headers.get("host")
    if not host_header:
        return ""

    host = urlsplit(f"//{host_header}").hostname
    if not host:
        return ""

    return host.rstrip(".").lower()


def _is_host_allowed(host: str, allowed_hosts: list[str]) -> bool:
    if "*" in allowed_hosts:
        return True

    for pattern in allowed_hosts:
        if pattern.startswith("*."):
            suffix = pattern[1:]
            if host.endswith(suffix) and host != suffix[1:]:
                return True
            continue

        if host == pattern:
            return True

    return False
