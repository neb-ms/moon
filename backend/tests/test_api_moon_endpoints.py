from datetime import datetime

from app.main import app
from fastapi.testclient import TestClient


def test_dashboard_endpoint_returns_contract_payload() -> None:
    client = TestClient(app)

    response = client.get(
        "/api/v1/dashboard",
        params={"lat": 40.7128, "lon": -74.006, "date": "2026-03-07"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {
        "date",
        "phase_name",
        "illumination_pct",
        "moonrise_local",
        "moonset_local",
        "zodiac_sign",
        "vibe",
    }
    assert payload["date"] == "2026-03-07"
    assert isinstance(payload["phase_name"], str)
    assert isinstance(payload["illumination_pct"], float)
    assert isinstance(payload["zodiac_sign"], str)
    assert isinstance(payload["vibe"], str)

    if payload["moonrise_local"] is not None:
        datetime.fromisoformat(payload["moonrise_local"])
    if payload["moonset_local"] is not None:
        datetime.fromisoformat(payload["moonset_local"])


def test_calendar_endpoint_returns_contract_payload() -> None:
    client = TestClient(app)

    response = client.get(
        "/api/v1/calendar",
        params={"lat": 40.7128, "lon": -74.006, "month": "2026-02"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["month"] == "2026-02"
    assert len(payload["days"]) == 28

    first_day = payload["days"][0]
    assert set(first_day.keys()) == {
        "date",
        "phase_name",
        "illumination_pct",
        "zodiac_sign",
        "icon_key",
    }


def test_validation_error_uses_error_envelope() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/dashboard", params={"lat": 400.0, "lon": -74.006})

    assert response.status_code == 422
    payload = response.json()
    assert "error" in payload
    assert payload["error"]["code"] == "validation_error"
    assert isinstance(payload["error"]["details"], list)


def test_internal_calculation_error_uses_error_envelope(monkeypatch) -> None:
    from app.api import routes

    def broken_calculation(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(routes, "calculate_moon_phase_illumination", broken_calculation)
    client = TestClient(app)

    response = client.get(
        "/api/v1/dashboard",
        params={"lat": 40.7128, "lon": -74.006, "date": "2026-03-07"},
    )

    assert response.status_code == 500
    payload = response.json()
    assert payload == {
        "error": {
            "code": "calculation_error",
            "message": "Failed to compute dashboard data.",
            "details": None,
        }
    }
