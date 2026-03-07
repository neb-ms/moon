from __future__ import annotations

from functools import lru_cache

from timezonefinder import TimezoneFinder


def resolve_timezone_name(*, latitude: float, longitude: float) -> str:
    _validate_coordinates(latitude=latitude, longitude=longitude)

    finder = _timezone_finder()
    timezone_name = finder.timezone_at(lat=latitude, lng=longitude)

    if timezone_name is None and hasattr(finder, "certain_timezone_at"):
        timezone_name = finder.certain_timezone_at(lat=latitude, lng=longitude)

    return timezone_name or "UTC"


@lru_cache(maxsize=1)
def _timezone_finder() -> TimezoneFinder:
    return TimezoneFinder(in_memory=True)


def _validate_coordinates(*, latitude: float, longitude: float) -> None:
    if not -90.0 <= latitude <= 90.0:
        raise ValueError("latitude must be between -90 and 90")
    if not -180.0 <= longitude <= 180.0:
        raise ValueError("longitude must be between -180 and 180")
