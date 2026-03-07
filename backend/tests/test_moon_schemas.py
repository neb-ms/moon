from datetime import date, datetime, timedelta, timezone

import pytest
from app.schemas import (
    PHASE_ICON_KEY_BY_NAME,
    PHASE_NAMES,
    ZODIAC_SIGNS,
    CalendarDayResponse,
    CalendarResponse,
    DashboardResponse,
    PhaseIconKey,
    PhaseName,
    ZodiacSign,
)
from pydantic import ValidationError


def test_phase_constants_are_stable() -> None:
    assert PHASE_NAMES == (
        "New Moon",
        "Waxing Crescent",
        "First Quarter",
        "Waxing Gibbous",
        "Full Moon",
        "Waning Gibbous",
        "Last Quarter",
        "Waning Crescent",
    )
    assert PHASE_ICON_KEY_BY_NAME[PhaseName.FULL_MOON] == PhaseIconKey.FULL_MOON
    assert ZODIAC_SIGNS[0] == "Aries"
    assert ZODIAC_SIGNS[-1] == "Pisces"


def test_dashboard_response_serializes_to_api_contract_shape() -> None:
    local_tz = timezone(timedelta(hours=-5))
    payload = DashboardResponse(
        date=date(2026, 3, 7),
        phase_name=PhaseName.WAXING_GIBBOUS,
        illumination_pct=74.5,
        moonrise_local=datetime(2026, 3, 7, 14, 12, tzinfo=local_tz),
        moonset_local=datetime(2026, 3, 8, 3, 43, tzinfo=local_tz),
        zodiac_sign=ZodiacSign.LEO,
        vibe="Momentum builds as the moonlight grows.",
    )

    assert payload.model_dump(mode="json") == {
        "date": "2026-03-07",
        "phase_name": "Waxing Gibbous",
        "illumination_pct": 74.5,
        "moonrise_local": "2026-03-07T14:12:00-05:00",
        "moonset_local": "2026-03-08T03:43:00-05:00",
        "zodiac_sign": "Leo",
        "vibe": "Momentum builds as the moonlight grows.",
    }


def test_calendar_response_serializes_to_api_contract_shape() -> None:
    day = CalendarDayResponse(
        date=date(2026, 3, 7),
        phase_name=PhaseName.WAXING_GIBBOUS,
        illumination_pct=74.5,
        zodiac_sign=ZodiacSign.LEO,
        icon_key=PhaseIconKey.WAXING_GIBBOUS,
    )
    payload = CalendarResponse(month="2026-03", days=[day])

    assert payload.model_dump(mode="json") == {
        "month": "2026-03",
        "days": [
            {
                "date": "2026-03-07",
                "phase_name": "Waxing Gibbous",
                "illumination_pct": 74.5,
                "zodiac_sign": "Leo",
                "icon_key": "waxing_gibbous",
            }
        ],
    }


def test_dashboard_rejects_invalid_illumination() -> None:
    with pytest.raises(ValidationError):
        DashboardResponse(
            date=date(2026, 3, 7),
            phase_name=PhaseName.WAXING_GIBBOUS,
            illumination_pct=120.0,
            zodiac_sign=ZodiacSign.LEO,
            vibe="This should fail validation.",
        )
