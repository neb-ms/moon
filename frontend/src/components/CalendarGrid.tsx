import { useMemo } from "react";

import { phaseNameToProgress } from "../theme/lunarPhases";
import { buildMoonCells } from "../theme/moonPixels";

type CalendarPhaseDay = {
  date: string;
  phaseName: string;
  illuminationPct: number;
  zodiacSign: string;
};

type CalendarGridProps = {
  month: string;
  days: CalendarPhaseDay[];
  selectedDate?: string | null;
  todayDate?: string;
  onSelectDate?: (date: string) => void;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GRID_WEEKS = 6;
const ICON_GRID_SIZE = 8;

function CalendarGrid({ month, days, selectedDate = null, todayDate, onSelectDate }: CalendarGridProps) {
  const monthStart = parseMonthStart(month);
  const todayIso = todayDate ?? toIsoDate(new Date());

  const cells = useMemo(() => {
    const dayMap = new Map(days.map((entry) => [entry.date, entry.phaseName]));
    const firstWeekday = monthStart.getUTCDay();
    const gridStart = addDays(monthStart, -firstWeekday);

    return Array.from({ length: WEEKDAY_LABELS.length * GRID_WEEKS }, (_, index) => {
      const current = addDays(gridStart, index);
      const isoDate = toIsoDate(current);
      const inCurrentMonth = current.getUTCMonth() === monthStart.getUTCMonth();

      return {
        date: current,
        isoDate,
        inCurrentMonth,
        phaseName: dayMap.get(isoDate) ?? "New Moon",
      };
    });
  }, [days, monthStart]);

  return (
    <div className="space-y-3" data-testid="calendar-grid">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((weekday) => (
          <p
            className="text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted"
            key={weekday}
          >
            {weekday}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => {
          const isToday = cell.isoDate === todayIso;
          const isSelected = selectedDate === cell.isoDate;

          return (
            <button
              aria-label={`Select ${cell.isoDate} ${cell.phaseName}`}
              aria-pressed={isSelected}
              className={`aspect-square rounded-lg border p-1 text-left transition ${
                cell.inCurrentMonth
                  ? "border-edge/70 bg-bg/60 text-text hover:border-accent/60"
                  : "border-edge/30 bg-bg/25 text-muted/70 hover:border-edge/50"
              } ${
                isToday ? "ring-1 ring-accent/60" : ""
              } ${
                isSelected ? "border-accent bg-accent/10" : ""
              }`}
              data-current-month={cell.inCurrentMonth ? "true" : "false"}
              data-date={cell.isoDate}
              data-selected={isSelected ? "true" : "false"}
              data-today={isToday ? "true" : "false"}
              key={cell.isoDate}
              onClick={() => onSelectDate?.(cell.isoDate)}
              type="button"
            >
              <span className="block font-mono text-[10px] leading-none">{cell.date.getUTCDate()}</span>
              <MiniMoonIcon dimmed={!cell.inCurrentMonth} phaseName={cell.phaseName} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

type MiniMoonIconProps = {
  phaseName: string;
  dimmed: boolean;
};

function MiniMoonIcon({ phaseName, dimmed }: MiniMoonIconProps) {
  const cells = useMemo(
    () =>
      buildMoonCells({
        gridSize: ICON_GRID_SIZE,
        phaseProgress: phaseNameToProgress(phaseName),
      }),
    [phaseName],
  );

  return (
    <span
      aria-hidden="true"
      className={`mt-1 block rounded border p-[2px] ${
        dimmed ? "border-edge/30 bg-bg/35" : "border-edge/50 bg-bg/50"
      }`}
    >
      <span
        className="grid gap-[1px]"
        style={{ gridTemplateColumns: `repeat(${ICON_GRID_SIZE}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => {
          const backgroundColor = !cell.inside
            ? "transparent"
            : cell.lit
              ? "rgb(var(--color-accent-warm))"
              : "rgb(var(--color-edge))";

          return (
            <span
              className="aspect-square rounded-[1px]"
              key={cell.key}
              style={{
                backgroundColor,
                opacity: dimmed ? 0.7 : 1,
              }}
            />
          );
        })}
      </span>
    </span>
  );
}

function parseMonthStart(month: string): Date {
  const [yearToken, monthToken] = month.split("-");
  const year = Number(yearToken);
  const monthIndex = Number(monthToken) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new Error(`Invalid month value: ${month}`);
  }

  return new Date(Date.UTC(year, monthIndex, 1));
}

function addDays(dateValue: Date, days: number): Date {
  const next = new Date(dateValue);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoDate(dateValue: Date): string {
  return dateValue.toISOString().slice(0, 10);
}

export type { CalendarGridProps, CalendarPhaseDay };
export default CalendarGrid;
