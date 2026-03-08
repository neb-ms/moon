type ApiErrorEnvelope = {
  error?: {
    message?: string;
  };
};

type DashboardApiResponse = {
  date: string;
  phase_name: string;
  illumination_pct: number;
  moonrise_local: string | null;
  moonset_local: string | null;
  zodiac_sign: string;
  vibe: string;
};

type CalendarDayApiResponse = {
  date: string;
  phase_name: string;
  illumination_pct: number;
  zodiac_sign: string;
  icon_key: string;
};

type CalendarApiResponse = {
  month: string;
  days: CalendarDayApiResponse[];
};

type Coordinates = {
  lat: number;
  lon: number;
};

type DashboardData = {
  date: string;
  phaseName: string;
  illuminationPct: number;
  moonriseLocal: string | null;
  moonsetLocal: string | null;
  zodiacSign: string;
  vibe: string;
};

type CalendarDayData = {
  date: string;
  phaseName: string;
  illuminationPct: number;
  zodiacSign: string;
  iconKey: string;
};

type CalendarData = {
  month: string;
  days: CalendarDayData[];
};

type RequestOptions = {
  signal?: AbortSignal;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

async function fetchDashboardData(
  coordinates: Coordinates,
  options: RequestOptions = {},
): Promise<DashboardData> {
  const params = new URLSearchParams({
    lat: String(coordinates.lat),
    lon: String(coordinates.lon),
  });
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard?${params.toString()}`, {
    cache: "no-store",
    signal: options.signal,
  });
  const payload = await parseApiResponse<DashboardApiResponse>(response);

  return {
    date: payload.date,
    phaseName: payload.phase_name,
    illuminationPct: payload.illumination_pct,
    moonriseLocal: payload.moonrise_local,
    moonsetLocal: payload.moonset_local,
    zodiacSign: payload.zodiac_sign,
    vibe: payload.vibe,
  };
}

async function fetchCalendarData(
  coordinates: Coordinates,
  month: string,
  options: RequestOptions = {},
): Promise<CalendarData> {
  const params = new URLSearchParams({
    lat: String(coordinates.lat),
    lon: String(coordinates.lon),
    month,
  });
  const response = await fetch(`${API_BASE_URL}/api/v1/calendar?${params.toString()}`, {
    cache: "no-store",
    signal: options.signal,
  });
  const payload = await parseApiResponse<CalendarApiResponse>(response);

  return {
    month: payload.month,
    days: payload.days.map((day) => ({
      date: day.date,
      phaseName: day.phase_name,
      illuminationPct: day.illumination_pct,
      zodiacSign: day.zodiac_sign,
      iconKey: day.icon_key,
    })),
  };
}

function normalizeApiBaseUrl(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\/$/, "");
}

async function parseApiResponse<TPayload>(response: Response): Promise<TPayload> {
  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response));
  }

  return (await response.json()) as TPayload;
}

async function parseApiErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorEnvelope;
    const message = payload.error?.message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  } catch {
    // Ignore malformed responses and return fallback below.
  }

  return "Project Lunar could not load fresh moon data.";
}

export type { CalendarData, CalendarDayData, Coordinates, DashboardData };
export { fetchCalendarData, fetchDashboardData };
