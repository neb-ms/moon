import type { CalendarPhaseDay } from "../components/CalendarGrid";

type DashboardSample = {
  phaseName: string;
  zodiacSign: string;
  vibe: string;
  illuminationPct: number;
  moonriseLocal: string;
  moonsetLocal: string;
};

const phaseCycle = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
] as const;

const demoMonth = "2026-03";

const dashboardSample: DashboardSample = {
  phaseName: "Waxing Gibbous",
  zodiacSign: "Scorpio",
  vibe: "Refine one important decision and let the rest stay simple tonight.",
  illuminationPct: 74.2,
  moonriseLocal: "2026-03-07T17:48:00-05:00",
  moonsetLocal: "2026-03-08T06:21:00-05:00",
};

function buildMockCalendarDays(month: string): CalendarPhaseDay[] {
  const [yearToken, monthToken] = month.split("-");
  const year = Number(yearToken);
  const monthIndex = Number(monthToken) - 1;
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const phaseName = phaseCycle[index % phaseCycle.length];

    return {
      date,
      phaseName,
      illuminationPct: Math.round((((index * 11) % 100) + 0.5) * 10) / 10,
      zodiacSign: "Scorpio",
    };
  });
}

export { buildMockCalendarDays, dashboardSample, demoMonth };
