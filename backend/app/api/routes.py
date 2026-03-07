from __future__ import annotations

import calendar
from datetime import UTC, date, datetime, time
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Query, status

from ..errors import ApiError
from ..schemas import (
    PHASE_ICON_KEY_BY_NAME,
    CalendarDayResponse,
    CalendarResponse,
    DashboardResponse,
    ErrorEnvelope,
)
from ..services import (
    calculate_moon_phase_illumination,
    calculate_moonrise_moonset,
    calculate_zodiac_sign,
    generate_daily_vibe,
    resolve_timezone_name,
)

LatQuery = Annotated[float, Query(ge=-90.0, le=90.0)]
LonQuery = Annotated[float, Query(ge=-180.0, le=180.0)]
MonthQuery = Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]

api_router = APIRouter(tags=["moon"])


@api_router.get(
    "/dashboard",
    response_model=DashboardResponse,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"model": ErrorEnvelope},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorEnvelope},
    },
)
def get_dashboard(
    lat: LatQuery,
    lon: LonQuery,
    requested_date: Annotated[date | None, Query(alias="date")] = None,
) -> DashboardResponse:
    try:
        timezone_name = resolve_timezone_name(latitude=lat, longitude=lon)
        tz = ZoneInfo(timezone_name)
    except ValueError as exc:
        raise ApiError(code="invalid_location", message=str(exc), status_code=400) from exc

    target_date = requested_date or datetime.now(tz).date()
    observed_at = datetime.combine(target_date, time(hour=12), tzinfo=tz).astimezone(UTC)

    try:
        phase = calculate_moon_phase_illumination(
            observed_at=observed_at,
            latitude=lat,
            longitude=lon,
        )
        rise_set = calculate_moonrise_moonset(
            on_date=target_date,
            latitude=lat,
            longitude=lon,
            timezone_name=timezone_name,
        )
        zodiac = calculate_zodiac_sign(observed_at=observed_at)
    except ValueError as exc:
        raise ApiError(code="calculation_error", message=str(exc), status_code=400) from exc
    except Exception as exc:  # pragma: no cover - handled by app exception handler
        raise ApiError(
            code="calculation_error",
            message="Failed to compute dashboard data.",
            status_code=500,
        ) from exc

    vibe = generate_daily_vibe(
        on_date=target_date,
        phase_name=phase.phase_name,
        zodiac_sign=zodiac.zodiac_sign,
    )

    return DashboardResponse(
        date=target_date,
        phase_name=phase.phase_name,
        illumination_pct=phase.illumination_pct,
        moonrise_local=rise_set.moonrise_local,
        moonset_local=rise_set.moonset_local,
        zodiac_sign=zodiac.zodiac_sign,
        vibe=vibe,
    )


@api_router.get(
    "/calendar",
    response_model=CalendarResponse,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope},
        status.HTTP_422_UNPROCESSABLE_ENTITY: {"model": ErrorEnvelope},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"model": ErrorEnvelope},
    },
)
def get_calendar(
    lat: LatQuery,
    lon: LonQuery,
    month: MonthQuery,
) -> CalendarResponse:
    try:
        timezone_name = resolve_timezone_name(latitude=lat, longitude=lon)
        tz = ZoneInfo(timezone_name)
        month_start = _parse_month_start(month)
    except ValueError as exc:
        raise ApiError(code="invalid_month", message=str(exc), status_code=400) from exc

    day_count = calendar.monthrange(month_start.year, month_start.month)[1]
    days: list[CalendarDayResponse] = []

    try:
        for day_number in range(1, day_count + 1):
            current_date = date(month_start.year, month_start.month, day_number)
            observed_at = datetime.combine(current_date, time(hour=12), tzinfo=tz).astimezone(UTC)

            phase = calculate_moon_phase_illumination(
                observed_at=observed_at,
                latitude=lat,
                longitude=lon,
            )
            zodiac = calculate_zodiac_sign(observed_at=observed_at)

            days.append(
                CalendarDayResponse(
                    date=current_date,
                    phase_name=phase.phase_name,
                    illumination_pct=phase.illumination_pct,
                    zodiac_sign=zodiac.zodiac_sign,
                    icon_key=PHASE_ICON_KEY_BY_NAME[phase.phase_name],
                )
            )
    except ValueError as exc:
        raise ApiError(code="calculation_error", message=str(exc), status_code=400) from exc
    except Exception as exc:  # pragma: no cover - handled by app exception handler
        raise ApiError(
            code="calculation_error",
            message="Failed to compute calendar data.",
            status_code=500,
        ) from exc

    return CalendarResponse(month=month, days=days)


def _parse_month_start(month: str) -> date:
    try:
        return date.fromisoformat(f"{month}-01")
    except ValueError as exc:
        raise ValueError("month must be in YYYY-MM format") from exc
