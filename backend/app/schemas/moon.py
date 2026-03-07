from datetime import date, datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class PhaseName(StrEnum):
    NEW_MOON = "New Moon"
    WAXING_CRESCENT = "Waxing Crescent"
    FIRST_QUARTER = "First Quarter"
    WAXING_GIBBOUS = "Waxing Gibbous"
    FULL_MOON = "Full Moon"
    WANING_GIBBOUS = "Waning Gibbous"
    LAST_QUARTER = "Last Quarter"
    WANING_CRESCENT = "Waning Crescent"


class PhaseIconKey(StrEnum):
    NEW_MOON = "new_moon"
    WAXING_CRESCENT = "waxing_crescent"
    FIRST_QUARTER = "first_quarter"
    WAXING_GIBBOUS = "waxing_gibbous"
    FULL_MOON = "full_moon"
    WANING_GIBBOUS = "waning_gibbous"
    LAST_QUARTER = "last_quarter"
    WANING_CRESCENT = "waning_crescent"


class ZodiacSign(StrEnum):
    ARIES = "Aries"
    TAURUS = "Taurus"
    GEMINI = "Gemini"
    CANCER = "Cancer"
    LEO = "Leo"
    VIRGO = "Virgo"
    LIBRA = "Libra"
    SCORPIO = "Scorpio"
    SAGITTARIUS = "Sagittarius"
    CAPRICORN = "Capricorn"
    AQUARIUS = "Aquarius"
    PISCES = "Pisces"


PHASE_NAMES: tuple[str, ...] = tuple(phase.value for phase in PhaseName)
ZODIAC_SIGNS: tuple[str, ...] = tuple(sign.value for sign in ZodiacSign)
PHASE_ICON_KEY_BY_NAME: dict[PhaseName, PhaseIconKey] = {
    PhaseName.NEW_MOON: PhaseIconKey.NEW_MOON,
    PhaseName.WAXING_CRESCENT: PhaseIconKey.WAXING_CRESCENT,
    PhaseName.FIRST_QUARTER: PhaseIconKey.FIRST_QUARTER,
    PhaseName.WAXING_GIBBOUS: PhaseIconKey.WAXING_GIBBOUS,
    PhaseName.FULL_MOON: PhaseIconKey.FULL_MOON,
    PhaseName.WANING_GIBBOUS: PhaseIconKey.WANING_GIBBOUS,
    PhaseName.LAST_QUARTER: PhaseIconKey.LAST_QUARTER,
    PhaseName.WANING_CRESCENT: PhaseIconKey.WANING_CRESCENT,
}


MonthValue = Annotated[str, Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]
IlluminationPct = Annotated[float, Field(ge=0.0, le=100.0)]
VibeText = Annotated[str, Field(min_length=1, max_length=180)]


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DateInfo(ContractModel):
    date: date


class PhaseInfo(ContractModel):
    phase_name: PhaseName


class IlluminationInfo(ContractModel):
    illumination_pct: IlluminationPct


class RiseSetInfo(ContractModel):
    moonrise_local: datetime | None = None
    moonset_local: datetime | None = None


class ZodiacInfo(ContractModel):
    zodiac_sign: ZodiacSign


class VibeInfo(ContractModel):
    vibe: VibeText


class DashboardResponse(DateInfo, PhaseInfo, IlluminationInfo, RiseSetInfo, ZodiacInfo, VibeInfo):
    pass


class CalendarDayResponse(DateInfo, PhaseInfo, IlluminationInfo, ZodiacInfo):
    icon_key: PhaseIconKey


class CalendarResponse(ContractModel):
    month: MonthValue
    days: list[CalendarDayResponse] = Field(default_factory=list)
