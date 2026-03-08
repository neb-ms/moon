from datetime import datetime

from app.main import app
from fastapi.testclient import TestClient


def test_health_returns_ok_payload() -> None:
    client = TestClient(app)

    response = client.get("/health")
    payload = response.json()

    assert response.status_code == 200
    assert payload["status"] == "ok"
    assert payload["app_name"] == "Project Lunar API"
    assert payload["environment"] == "development"
    assert payload["version"] == "0.1.0"
    assert isinstance(payload["uptime_seconds"], float)
    assert payload["uptime_seconds"] >= 0.0
    assert isinstance(payload["started_at_utc"], str)

    parsed_started_at = datetime.fromisoformat(payload["started_at_utc"].replace("Z", "+00:00"))
    assert parsed_started_at.tzinfo is not None
