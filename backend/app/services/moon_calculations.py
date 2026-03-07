from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path

from skyfield import almanac
from skyfield.api import Loader

from ..schemas import PhaseName

DEFAULT_EPHEMERIS_FILENAME = "de421.bsp"
PHASE_ORDER: tuple[PhaseName, ...] = (
    PhaseName.NEW_MOON,
    PhaseName.WAXING_CRESCENT,
    PhaseName.FIRST_QUARTER,
    PhaseName.WAXING_GIBBOUS,
    PhaseName.FULL_MOON,
    PhaseName.WANING_GIBBOUS,
    PhaseName.LAST_QUARTER,
    PhaseName.WANING_CRESCENT,
)


@dataclass(frozen=True, slots=True)
class MoonPhaseComputation:
    timestamp_utc: datetime
    phase_name: PhaseName
    illumination_pct: float
    phase_angle_deg: float


def calculate_moon_phase_illumination(
    *,
    observed_at: datetime,
    latitude: float,
    longitude: float,
    ephemeris_path: str | Path | None = None,
) -> MoonPhaseComputation:
    """Compute moon phase and illumination using skyfield.

    Latitude/longitude are validated and included in the cache key for consistent
    request semantics with upcoming location-aware calculations.
    """

    _validate_coordinates(latitude=latitude, longitude=longitude)
    observed_at_utc = _normalize_to_utc_minute(observed_at)
    ephemeris_dir, ephemeris_filename = _resolve_ephemeris_location(ephemeris_path)

    return _calculate_moon_phase_illumination_cached(
        observed_at_utc.isoformat(),
        round(latitude, 4),
        round(longitude, 4),
        ephemeris_dir,
        ephemeris_filename,
    )


def clear_moon_calculation_cache() -> None:
    _calculate_moon_phase_illumination_cached.cache_clear()
    _load_ephemeris_and_timescale.cache_clear()


def moon_calculation_cache_stats() -> dict[str, int]:
    info = _calculate_moon_phase_illumination_cached.cache_info()
    return {
        "hits": info.hits,
        "misses": info.misses,
        "maxsize": info.maxsize or 0,
        "currsize": info.currsize,
    }


@lru_cache(maxsize=4)
def _load_ephemeris_and_timescale(ephemeris_dir: str, ephemeris_filename: str):
    loader = Loader(ephemeris_dir)
    timescale = loader.timescale()
    ephemeris = loader(ephemeris_filename)
    return ephemeris, timescale


@lru_cache(maxsize=4096)
def _calculate_moon_phase_illumination_cached(
    observed_at_iso_utc: str,
    latitude_key: float,
    longitude_key: float,
    ephemeris_dir: str,
    ephemeris_filename: str,
) -> MoonPhaseComputation:
    # `latitude_key` and `longitude_key` are intentionally included in this cache
    # key to preserve correctness for follow-up location-aware lunar calculations.
    _ = latitude_key, longitude_key

    ephemeris, timescale = _load_ephemeris_and_timescale(ephemeris_dir, ephemeris_filename)
    observed_at = datetime.fromisoformat(observed_at_iso_utc)
    t = timescale.from_datetime(observed_at)

    phase_angle_deg = float(almanac.moon_phase(ephemeris, t).degrees % 360.0)
    illumination_pct = round(
        float(almanac.fraction_illuminated(ephemeris, "moon", t) * 100.0),
        2,
    )

    return MoonPhaseComputation(
        timestamp_utc=observed_at,
        phase_name=_phase_name_from_angle(phase_angle_deg),
        illumination_pct=illumination_pct,
        phase_angle_deg=phase_angle_deg,
    )


def _phase_name_from_angle(phase_angle_deg: float) -> PhaseName:
    normalized = phase_angle_deg % 360.0
    index = int((normalized + 22.5) // 45) % len(PHASE_ORDER)
    return PHASE_ORDER[index]


def _resolve_ephemeris_location(ephemeris_path: str | Path | None) -> tuple[str, str]:
    if ephemeris_path is None:
        backend_root = Path(__file__).resolve().parents[2]
        candidate_path = backend_root / "data" / DEFAULT_EPHEMERIS_FILENAME
    else:
        candidate_path = Path(ephemeris_path)

    candidate_path.parent.mkdir(parents=True, exist_ok=True)
    return str(candidate_path.parent), candidate_path.name


def _normalize_to_utc_minute(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("observed_at must be timezone-aware")
    utc_value = value.astimezone(UTC)
    return utc_value.replace(second=0, microsecond=0)


def _validate_coordinates(*, latitude: float, longitude: float) -> None:
    if not -90.0 <= latitude <= 90.0:
        raise ValueError("latitude must be between -90 and 90")
    if not -180.0 <= longitude <= 180.0:
        raise ValueError("longitude must be between -180 and 180")
