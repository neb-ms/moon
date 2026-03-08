from __future__ import annotations

from app.main import create_app
from app.security import InMemoryRateLimitStore, RateLimitMiddleware
from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_rate_limit_store_resets_after_time_window() -> None:
    now = 0.0

    def now_fn() -> float:
        return now

    store = InMemoryRateLimitStore(max_requests=2, window_seconds=10, now_fn=now_fn)

    assert store.consume("ip-a") == (True, 0)
    assert store.consume("ip-a") == (True, 0)
    assert store.consume("ip-a") == (False, 10)

    now = 10.5
    assert store.consume("ip-a") == (True, 0)


def test_rate_limit_middleware_returns_429_after_threshold() -> None:
    app = FastAPI()
    store = InMemoryRateLimitStore(max_requests=2, window_seconds=60)
    app.add_middleware(RateLimitMiddleware, store=store, protected_path_prefixes=["/api/v1/"])

    @app.get("/api/v1/ping")
    async def ping() -> dict[str, str]:
        return {"status": "ok"}

    client = TestClient(app)

    assert client.get("/api/v1/ping").status_code == 200
    assert client.get("/api/v1/ping").status_code == 200

    limited_response = client.get("/api/v1/ping")
    assert limited_response.status_code == 429
    assert limited_response.headers["Retry-After"] == "60"
    assert limited_response.json() == {
        "error": {
            "code": "rate_limited",
            "message": "Too many requests. Please try again later.",
            "details": {"retry_after_seconds": 60},
        }
    }


def test_rate_limit_middleware_ignores_non_api_paths() -> None:
    app = FastAPI()
    store = InMemoryRateLimitStore(max_requests=1, window_seconds=60)
    app.add_middleware(RateLimitMiddleware, store=store, protected_path_prefixes=["/api/v1/"])

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    client = TestClient(app)

    assert client.get("/health").status_code == 200
    assert client.get("/health").status_code == 200


def test_create_app_registers_rate_limit_middleware() -> None:
    app = create_app()

    middleware_names = {middleware.cls.__name__ for middleware in app.user_middleware}
    assert "RateLimitMiddleware" in middleware_names
    assert "RequestLoggingMiddleware" in middleware_names
