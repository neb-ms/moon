from __future__ import annotations

import logging

from app.main import create_app
from fastapi.testclient import TestClient


class _CollectLogHandler(logging.Handler):
    def __init__(self) -> None:
        super().__init__()
        self.records: list[logging.LogRecord] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(record)


def _record_for_event(records: list[logging.LogRecord], event: str) -> logging.LogRecord:
    for record in records:
        if getattr(record, "event", None) == event:
            return record
    raise AssertionError(f"Missing log record with event={event}")


def test_request_logging_adds_request_id_header_and_structured_fields() -> None:
    app = create_app()
    logger: logging.Logger = app.state.request_logger
    collector = _CollectLogHandler()
    logger.addHandler(collector)

    try:
        client = TestClient(app)
        response = client.get(
            "/health",
            headers={
                "x-request-id": "req-h1-1",
                "user-agent": "pytest-observability",
            },
        )
    finally:
        logger.removeHandler(collector)

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "req-h1-1"

    request_log = _record_for_event(collector.records, "http_request")
    assert request_log.method == "GET"
    assert request_log.path == "/health"
    assert request_log.status_code == 200
    assert request_log.request_id == "req-h1-1"
    assert request_log.user_agent == "pytest-observability"
    assert request_log.host == "testserver"
    assert isinstance(request_log.duration_ms, float)
    assert request_log.duration_ms >= 0.0


def test_unhandled_exception_logs_error_context() -> None:
    app = create_app()

    @app.get("/boom")
    def boom() -> dict[str, str]:
        raise RuntimeError("unexpected failure")

    logger: logging.Logger = app.state.request_logger
    collector = _CollectLogHandler()
    logger.addHandler(collector)

    try:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/boom", headers={"x-request-id": "req-h1-err"})
    finally:
        logger.removeHandler(collector)

    assert response.status_code == 500

    exception_log = _record_for_event(collector.records, "unhandled_exception")
    assert exception_log.request_id == "req-h1-err"
    assert exception_log.method == "GET"
    assert exception_log.path == "/boom"
    assert exception_log.status_code == 500
    assert exception_log.error_code == "internal_server_error"
