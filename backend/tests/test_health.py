from app.main import app
from fastapi.testclient import TestClient


def test_health_returns_ok_payload() -> None:
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "app_name": "Project Lunar API",
        "environment": "development",
        "version": "0.1.0",
    }
