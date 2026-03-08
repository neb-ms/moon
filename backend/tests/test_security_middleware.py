from app.main import app, create_app
from fastapi.testclient import TestClient


def test_invalid_host_header_returns_sanitized_error() -> None:
    client = TestClient(app)

    response = client.get("/health", headers={"host": "attacker.invalid"})

    assert response.status_code == 400
    assert response.json() == {
        "error": {
            "code": "invalid_host",
            "message": "Invalid host header.",
            "details": None,
        }
    }


def test_oversized_request_body_returns_413_envelope() -> None:
    client = TestClient(app)

    response = client.request("GET", "/health", content=b"x" * 1_100_000)

    assert response.status_code == 413
    assert response.json() == {
        "error": {
            "code": "payload_too_large",
            "message": "Request body exceeds 1048576 bytes.",
            "details": None,
        }
    }


def test_validation_error_details_are_sanitized() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/dashboard", params={"lat": "not-a-number", "lon": -74.006})

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["code"] == "validation_error"
    assert isinstance(payload["error"]["details"], list)
    assert payload["error"]["details"]

    first_error = payload["error"]["details"][0]
    assert set(first_error.keys()) == {"type", "loc", "msg"}


def test_unhandled_exceptions_use_sanitized_error_envelope() -> None:
    test_app = create_app()

    @test_app.get("/boom")
    def boom() -> dict[str, str]:
        raise RuntimeError("sensitive traceback detail")

    client = TestClient(test_app, raise_server_exceptions=False)

    response = client.get("/boom")

    assert response.status_code == 500
    assert response.json() == {
        "error": {
            "code": "internal_server_error",
            "message": "An unexpected error occurred.",
            "details": None,
        }
    }


def test_method_not_allowed_returns_error_envelope() -> None:
    client = TestClient(app)

    response = client.post("/health")

    assert response.status_code == 405
    assert response.json() == {
        "error": {
            "code": "method_not_allowed",
            "message": "Method not allowed.",
            "details": None,
        }
    }
