from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from skyfield import almanac
from skyfield.api import Loader, wgs84

DEFAULT_EPHEMERIS_FILENAME = "de421.bsp"


@dataclass(frozen=True, slots=True)
class MoonRiseSetComputation:
    date_local: date
    timezone_name: str
    moonrise_local: datetime | None
    moonset_local: datetime | None


def calculate_moonrise_moonset(
    *,
    on_date: date,
    latitude: float,
    longitude: float,
    timezone_name: str,
    ephemeris_path: str | Path | None = None,
) -> MoonRiseSetComputation:
    _validate_coordinates(latitude=latitude, longitude=longitude)
    tz = _load_timezone(timezone_name)
    ephemeris_dir, ephemeris_filename = _resolve_ephemeris_location(ephemeris_path)

    return _calculate_moonrise_moonset_cached(
        on_date.isoformat(),
        round(latitude, 4),
        round(longitude, 4),
        timezone_name,
        ephemeris_dir,
        ephemeris_filename,
        tz.key,
    )


@lru_cache(maxsize=4)
def _load_ephemeris_and_timescale(ephemeris_dir: str, ephemeris_filename: str):
    loader = Loader(ephemeris_dir)
    timescale = loader.timescale()
    ephemeris = loader(ephemeris_filename)
    return ephemeris, timescale


@lru_cache(maxsize=4096)
def _calculate_moonrise_moonset_cached(
    on_date_iso: str,
    latitude_key: float,
    longitude_key: float,
    timezone_name: str,
    ephemeris_dir: str,
    ephemeris_filename: str,
    timezone_key: str,
) -> MoonRiseSetComputation:
    _ = latitude_key, longitude_key, timezone_name

    target_date = date.fromisoformat(on_date_iso)
    tz = ZoneInfo(timezone_key)
    window_start_local = datetime.combine(target_date, time.min, tzinfo=tz)
    window_end_local = window_start_local + timedelta(days=1)

    ephemeris, timescale = _load_ephemeris_and_timescale(ephemeris_dir, ephemeris_filename)
    moon = ephemeris["Moon"]
    observer = wgs84.latlon(latitude_degrees=latitude_key, longitude_degrees=longitude_key)

    t0 = timescale.from_datetime(window_start_local.astimezone(UTC))
    t1 = timescale.from_datetime(window_end_local.astimezone(UTC))

    event_times, event_states = almanac.find_discrete(
        t0,
        t1,
        almanac.risings_and_settings(ephemeris, moon, observer),
    )

    moonrise_local: datetime | None = None
    moonset_local: datetime | None = None

    for event_time, is_rising in zip(event_times, event_states, strict=True):
        event_local = _to_local_datetime(event_time.utc_datetime(), tz)
        if event_local.date() != target_date:
            continue
        if is_rising and moonrise_local is None:
            moonrise_local = event_local
        elif not is_rising and moonset_local is None:
            moonset_local = event_local

    return MoonRiseSetComputation(
        date_local=target_date,
        timezone_name=timezone_key,
        moonrise_local=moonrise_local,
        moonset_local=moonset_local,
    )


def _to_local_datetime(value: datetime, tz: ZoneInfo) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        utc_value = value.replace(tzinfo=UTC)
    else:
        utc_value = value.astimezone(UTC)
    return utc_value.astimezone(tz)


def _load_timezone(timezone_name: str) -> ZoneInfo:
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"unknown timezone: {timezone_name}") from exc


def _resolve_ephemeris_location(ephemeris_path: str | Path | None) -> tuple[str, str]:
    if ephemeris_path is None:
        backend_root = Path(__file__).resolve().parents[2]
        candidate_path = backend_root / "data" / DEFAULT_EPHEMERIS_FILENAME
    else:
        candidate_path = Path(ephemeris_path)

    candidate_path.parent.mkdir(parents=True, exist_ok=True)
    return str(candidate_path.parent), candidate_path.name


def _validate_coordinates(*, latitude: float, longitude: float) -> None:
    if not -90.0 <= latitude <= 90.0:
        raise ValueError("latitude must be between -90 and 90")
    if not -180.0 <= longitude <= 180.0:
        raise ValueError("longitude must be between -180 and 180")
