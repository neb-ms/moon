from datetime import UTC, date, datetime

from app.schemas import PhaseName, ZodiacSign
from app.services import (
    calculate_zodiac_sign,
    generate_daily_vibe,
    zodiac_sign_from_ecliptic_longitude,
)


def test_zodiac_longitude_mapping_boundaries() -> None:
    assert zodiac_sign_from_ecliptic_longitude(0.0) == ZodiacSign.ARIES
    assert zodiac_sign_from_ecliptic_longitude(29.999) == ZodiacSign.ARIES
    assert zodiac_sign_from_ecliptic_longitude(30.0) == ZodiacSign.TAURUS
    assert zodiac_sign_from_ecliptic_longitude(359.999) == ZodiacSign.PISCES
    assert zodiac_sign_from_ecliptic_longitude(390.0) == ZodiacSign.TAURUS


def test_calculate_zodiac_sign_matches_reference_timestamp() -> None:
    # Mar 25, 2024 full moon timestamp places the Moon in Libra by ecliptic longitude.
    result = calculate_zodiac_sign(observed_at=datetime(2024, 3, 25, 7, 0, tzinfo=UTC))

    assert result.zodiac_sign == ZodiacSign.LIBRA
    assert 180.0 <= result.ecliptic_longitude_deg < 210.0


def test_generate_daily_vibe_is_deterministic_and_safe() -> None:
    payload = {
        "on_date": date(2026, 3, 7),
        "phase_name": PhaseName.WAXING_GIBBOUS,
        "zodiac_sign": ZodiacSign.SCORPIO,
    }
    first = generate_daily_vibe(**payload)
    second = generate_daily_vibe(**payload)

    assert first == second
    assert 20 <= len(first) <= 180
    assert first.count(".") == 1
    assert "\n" not in first
    assert all(
        banned not in first.lower()
        for banned in ("guaranteed", "destiny", "cure", "medical", "financial")
    )


def test_generate_daily_vibe_varies_by_date() -> None:
    phase = PhaseName.WAXING_GIBBOUS
    sign = ZodiacSign.SCORPIO

    vibe_day_one = generate_daily_vibe(on_date=date(2026, 3, 7), phase_name=phase, zodiac_sign=sign)
    vibe_day_two = generate_daily_vibe(on_date=date(2026, 3, 8), phase_name=phase, zodiac_sign=sign)

    assert vibe_day_one != vibe_day_two
