import { useEffect, useMemo, useRef, useState } from "react";

import CalendarGrid, { type CalendarPhaseDay } from "../components/CalendarGrid";
import DateDetailSheet from "../components/DateDetailSheet";

import { buildMockCalendarDays, demoMonth } from "./mockLunarData";

function CalendarView() {
  const calendarDays = useMemo(() => buildMockCalendarDays(demoMonth), []);
  const calendarDayMap = useMemo(
    () => new Map(calendarDays.map((day) => [day.date, day])),
    [calendarDays],
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(calendarDays[8]?.date ?? null);
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const restoreFocusDateRef = useRef<string | null>(null);

  const detailDay = useMemo<CalendarPhaseDay | null>(() => {
    if (!detailDate) {
      return null;
    }

    return (
      calendarDayMap.get(detailDate) ?? {
        date: detailDate,
        phaseName: "New Moon",
        illuminationPct: 0,
        zodiacSign: "Unknown",
      }
    );
  }, [calendarDayMap, detailDate]);

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setDetailDate(date);
    setDetailOpen(true);
  }

  function handleCloseDetail() {
    setDetailOpen(false);
  }

  function handleDetailExited() {
    restoreFocusDateRef.current = selectedDate;
    setDetailDate(null);
  }

  useEffect(() => {
    if (detailOpen || detailDate !== null) {
      return;
    }

    const focusDate = restoreFocusDateRef.current;
    if (!focusDate) {
      return;
    }

    const dayButton = document.querySelector<HTMLButtonElement>(`button[data-date="${focusDate}"]`);
    dayButton?.focus();
    restoreFocusDateRef.current = null;
  }, [detailDate, detailOpen]);

  return (
    <>
      <article className="lunar-shell-enter lunar-surface rounded-panel border border-edge/70 bg-panel-soft/85 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Lunar Calendar Grid
          </p>
          <p className="text-xs text-muted">Tap a day</p>
        </div>
        <div className="mt-4">
          <CalendarGrid
            days={calendarDays}
            month={demoMonth}
            onSelectDate={handleSelectDate}
            selectedDate={selectedDate}
          />
        </div>
        {selectedDate && (
          <p className="mt-4 text-xs text-muted">
            Selected: <span className="font-mono text-text">{selectedDate}</span>
          </p>
        )}
      </article>
      {detailDay && (
        <DateDetailSheet
          day={detailDay}
          onClose={handleCloseDetail}
          onExited={handleDetailExited}
          open={detailOpen}
        />
      )}
    </>
  );
}

export default CalendarView;
