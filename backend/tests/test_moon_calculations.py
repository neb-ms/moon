from datetime import UTC, datetime

import pytest
from app.schemas import PhaseName
from app.services import (
    calculate_moon_phase_illumination,
    clear_moon_calculation_cache,
    moon_calculation_cache_stats,
)


def test_new_moon_reference_date_matches_expected_phase_and_illumination() -> None:
    # Total solar eclipse date/time (Apr 8, 2024) occurs at new moon.
    result = calculate_moon_phase_illumination(
        observed_at=datetime(2024, 4, 8, 18, 21, tzinfo=UTC),
        latitude=40.7128,
        longitude=-74.006,
    )

    assert result.phase_name == PhaseName.NEW_MOON
    assert result.illumination_pct <= 1.0


def test_full_moon_reference_date_matches_expected_phase_and_illumination() -> None:
    # Mar 25, 2024 full moon reference timestamp.
    result = calculate_moon_phase_illumination(
        observed_at=datetime(2024, 3, 25, 7, 0, tzinfo=UTC),
        latitude=34.0522,
        longitude=-118.2437,
    )

    assert result.phase_name == PhaseName.FULL_MOON
    assert result.illumination_pct >= 99.0


def test_repeated_lookup_uses_cache() -> None:
    clear_moon_calculation_cache()

    params = {
        "observed_at": datetime(2025, 1, 13, 22, 27, tzinfo=UTC),
        "latitude": 51.5074,
        "longitude": -0.1278,
    }
    first = calculate_moon_phase_illumination(**params)
    second = calculate_moon_phase_illumination(**params)
    stats = moon_calculation_cache_stats()

    assert first == second
    assert stats["misses"] == 1
    assert stats["hits"] == 1


def test_rejects_naive_datetime() -> None:
    with pytest.raises(ValueError, match="timezone-aware"):
        calculate_moon_phase_illumination(
            observed_at=datetime(2025, 1, 13, 22, 27),
            latitude=0.0,
            longitude=0.0,
        )


def test_rejects_invalid_coordinates() -> None:
    with pytest.raises(ValueError, match="latitude"):
        calculate_moon_phase_illumination(
            observed_at=datetime(2025, 1, 13, 22, 27, tzinfo=UTC),
            latitude=200.0,
            longitude=0.0,
        )
