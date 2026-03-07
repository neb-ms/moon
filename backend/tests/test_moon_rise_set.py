from datetime import date

import pytest
from app.services import calculate_moonrise_moonset


def test_moonrise_and_moonset_are_timezone_aware_for_new_york() -> None:
    target_date = date(2026, 3, 7)
    result = calculate_moonrise_moonset(
        on_date=target_date,
        latitude=40.7128,
        longitude=-74.006,
        timezone_name="America/New_York",
    )

    assert result.moonrise_local is not None
    assert result.moonset_local is not None
    assert result.moonrise_local.date() == target_date
    assert result.moonset_local.date() == target_date
    assert result.moonrise_local.tzinfo is not None
    assert result.moonset_local.tzinfo is not None
    assert result.timezone_name == "America/New_York"


def test_moonrise_and_moonset_are_timezone_aware_for_sydney() -> None:
    target_date = date(2026, 3, 7)
    result = calculate_moonrise_moonset(
        on_date=target_date,
        latitude=-33.8688,
        longitude=151.2093,
        timezone_name="Australia/Sydney",
    )

    assert result.moonrise_local is not None
    assert result.moonset_local is not None
    assert result.moonrise_local.date() == target_date
    assert result.moonset_local.date() == target_date
    assert result.timezone_name == "Australia/Sydney"


def test_handles_no_moonrise_day() -> None:
    # Utqiagvik, Alaska has polar lunar days where no moonrise occurs.
    result = calculate_moonrise_moonset(
        on_date=date(2026, 1, 8),
        latitude=71.2906,
        longitude=-156.7887,
        timezone_name="America/Anchorage",
    )

    assert result.moonrise_local is None
    assert result.moonset_local is not None


def test_handles_no_moonset_day() -> None:
    # Utqiagvik, Alaska has polar lunar days where no moonset occurs.
    result = calculate_moonrise_moonset(
        on_date=date(2026, 1, 23),
        latitude=71.2906,
        longitude=-156.7887,
        timezone_name="America/Anchorage",
    )

    assert result.moonrise_local is not None
    assert result.moonset_local is None


def test_handles_day_with_no_moonrise_and_no_moonset() -> None:
    result = calculate_moonrise_moonset(
        on_date=date(2026, 1, 1),
        latitude=71.2906,
        longitude=-156.7887,
        timezone_name="America/Anchorage",
    )

    assert result.moonrise_local is None
    assert result.moonset_local is None


def test_rejects_unknown_timezone() -> None:
    with pytest.raises(ValueError, match="unknown timezone"):
        calculate_moonrise_moonset(
            on_date=date(2026, 3, 7),
            latitude=40.7128,
            longitude=-74.006,
            timezone_name="Mars/Olympus_Mons",
        )
