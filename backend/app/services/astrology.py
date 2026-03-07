from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime
from functools import lru_cache
from hashlib import sha256
from pathlib import Path

from skyfield.api import Loader
from skyfield.framelib import ecliptic_frame

from ..schemas import PhaseName, ZodiacSign

DEFAULT_EPHEMERIS_FILENAME = "de421.bsp"
ZODIAC_ORDER: tuple[ZodiacSign, ...] = (
    ZodiacSign.ARIES,
    ZodiacSign.TAURUS,
    ZodiacSign.GEMINI,
    ZodiacSign.CANCER,
    ZodiacSign.LEO,
    ZodiacSign.VIRGO,
    ZodiacSign.LIBRA,
    ZodiacSign.SCORPIO,
    ZodiacSign.SAGITTARIUS,
    ZodiacSign.CAPRICORN,
    ZodiacSign.AQUARIUS,
    ZodiacSign.PISCES,
)

PHASE_VIBE_STEMS: dict[PhaseName, tuple[str, ...]] = {
    PhaseName.NEW_MOON: (
        "A reset mood is present",
        "Fresh momentum is available",
    ),
    PhaseName.WAXING_CRESCENT: (
        "Steady growth energy is active",
        "Progress builds through small steps",
    ),
    PhaseName.FIRST_QUARTER: (
        "Decision energy is strong",
        "Action feels clearer today",
    ),
    PhaseName.WAXING_GIBBOUS: (
        "Refinement and momentum are rising",
        "Preparation is paying off",
    ),
    PhaseName.FULL_MOON: (
        "Clarity is bright and immediate",
        "Emotions and insight are vivid",
    ),
    PhaseName.WANING_GIBBOUS: (
        "Reflection supports better pacing",
        "Integration matters more than speed",
    ),
    PhaseName.LAST_QUARTER: (
        "Release helps restore focus",
        "Editing priorities brings relief",
    ),
    PhaseName.WANING_CRESCENT: (
        "Rest and reset are supportive",
        "Quiet planning helps next steps",
    ),
}

ZODIAC_VIBE_THEMES: dict[ZodiacSign, tuple[str, ...]] = {
    ZodiacSign.ARIES: ("direct effort feels effective", "quick starts are easier to sustain"),
    ZodiacSign.TAURUS: ("practical habits feel stabilizing", "consistency improves your rhythm"),
    ZodiacSign.GEMINI: ("clear communication reduces friction", "curiosity helps you adapt"),
    ZodiacSign.CANCER: (
        "comfort and boundaries feel restorative",
        "careful pacing protects energy",
    ),
    ZodiacSign.LEO: ("creative confidence is easier to access", "visible progress boosts morale"),
    ZodiacSign.VIRGO: (
        "small improvements compound well",
        "organization supports calmer execution",
    ),
    ZodiacSign.LIBRA: ("balance helps decisions land cleanly", "cooperation smooths the workflow"),
    ZodiacSign.SCORPIO: (
        "focused attention cuts through noise",
        "depth over speed brings better results",
    ),
    ZodiacSign.SAGITTARIUS: (
        "big-picture thinking is motivating",
        "honest perspective keeps plans realistic",
    ),
    ZodiacSign.CAPRICORN: (
        "disciplined steps create traction",
        "long-term structure supports progress",
    ),
    ZodiacSign.AQUARIUS: (
        "fresh ideas can be tested safely",
        "experimentation benefits from clear limits",
    ),
    ZodiacSign.PISCES: (
        "intuition and rest support clarity",
        "gentle pacing helps insight surface",
    ),
}

VIBE_CLOSERS: tuple[str, ...] = (
    "choose one clear priority and move at a steady pace",
    "keep plans simple and adjust as new information appears",
    "protect your energy while making measurable progress",
)


@dataclass(frozen=True, slots=True)
class ZodiacComputation:
    timestamp_utc: datetime
    zodiac_sign: ZodiacSign
    ecliptic_longitude_deg: float


def calculate_zodiac_sign(
    *,
    observed_at: datetime,
    ephemeris_path: str | Path | None = None,
) -> ZodiacComputation:
    observed_at_utc = _normalize_to_utc_minute(observed_at)
    ephemeris_dir, ephemeris_filename = _resolve_ephemeris_location(ephemeris_path)

    return _calculate_zodiac_sign_cached(
        observed_at_utc.isoformat(),
        ephemeris_dir,
        ephemeris_filename,
    )


def zodiac_sign_from_ecliptic_longitude(longitude_deg: float) -> ZodiacSign:
    index = int((longitude_deg % 360.0) // 30.0)
    return ZODIAC_ORDER[index]


def generate_daily_vibe(
    *,
    on_date: date,
    phase_name: PhaseName,
    zodiac_sign: ZodiacSign,
) -> str:
    seed = f"{on_date.isoformat()}|{phase_name.value}|{zodiac_sign.value}"
    phase_stem = _pick_with_seed(PHASE_VIBE_STEMS[phase_name], seed + "|phase")
    zodiac_theme = _pick_with_seed(ZODIAC_VIBE_THEMES[zodiac_sign], seed + "|zodiac")
    closer = _pick_with_seed(VIBE_CLOSERS, seed + "|closer")

    vibe = f"{phase_stem} while {zodiac_theme}, so {closer}."
    return _normalize_vibe_sentence(vibe)


@lru_cache(maxsize=4)
def _load_ephemeris_and_timescale(ephemeris_dir: str, ephemeris_filename: str):
    loader = Loader(ephemeris_dir)
    timescale = loader.timescale()
    ephemeris = loader(ephemeris_filename)
    return ephemeris, timescale


@lru_cache(maxsize=4096)
def _calculate_zodiac_sign_cached(
    observed_at_iso_utc: str,
    ephemeris_dir: str,
    ephemeris_filename: str,
) -> ZodiacComputation:
    ephemeris, timescale = _load_ephemeris_and_timescale(ephemeris_dir, ephemeris_filename)
    observed_at = datetime.fromisoformat(observed_at_iso_utc)
    t = timescale.from_datetime(observed_at)

    earth = ephemeris["earth"]
    moon = ephemeris["moon"]
    moon_apparent = earth.at(t).observe(moon).apparent()
    _, ecliptic_lon, _ = moon_apparent.frame_latlon(ecliptic_frame)
    ecliptic_longitude_deg = float(ecliptic_lon.degrees % 360.0)

    return ZodiacComputation(
        timestamp_utc=observed_at,
        zodiac_sign=zodiac_sign_from_ecliptic_longitude(ecliptic_longitude_deg),
        ecliptic_longitude_deg=ecliptic_longitude_deg,
    )


def _pick_with_seed(options: tuple[str, ...], seed: str) -> str:
    digest = sha256(seed.encode("utf-8")).hexdigest()
    idx = int(digest[:8], 16) % len(options)
    return options[idx]


def _normalize_vibe_sentence(vibe: str) -> str:
    compact = " ".join(vibe.split())
    if len(compact) > 180:
        compact = compact[:179].rstrip(" ,;:") + "."
    if not compact.endswith("."):
        compact += "."
    return compact


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
