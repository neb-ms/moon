import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { fetchCalendarData } from "../api/moonApi";
import CalendarGrid, { type CalendarPhaseDay } from "../components/CalendarGrid";
import DateDetailSheet from "../components/DateDetailSheet";
import type { AppOutletContext } from "../location/appOutletContext";
import type { LocationPreference } from "../location/locationPreference";

import { buildMockCalendarDays, demoMonth } from "./mockLunarData";

function CalendarView() {
  const { locationPreference } = useOutletContext<AppOutletContext>();
  const [calendarMonth, setCalendarMonth] = useState(demoMonth);
  const [calendarDays, setCalendarDays] = useState<CalendarPhaseDay[]>(() => buildMockCalendarDays(demoMonth));
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const calendarDayMap = useMemo(
    () => new Map(calendarDays.map((day) => [day.date, day])),
    [calendarDays],
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(calendarDays[8]?.date ?? null);
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const restoreFocusDateRef = useRef<string | null>(null);

  const loadCalendar = useCallback(
    async (preference: LocationPreference, month: string, signal?: AbortSignal) => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetchCalendarData(
          {
            lat: preference.lat,
            lon: preference.lon,
          },
          month,
          { signal },
        );
        setCalendarMonth(response.month);
        setCalendarDays(
          response.days.map((day) => ({
            date: day.date,
            phaseName: day.phaseName,
            illuminationPct: day.illuminationPct,
            zodiacSign: day.zodiacSign,
          })),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Project Lunar could not load this month's moon chart.");
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!locationPreference) {
      const fallbackDays = buildMockCalendarDays(demoMonth);
      setCalendarMonth(demoMonth);
      setCalendarDays(fallbackDays);
      setSelectedDate(fallbackDays[8]?.date ?? fallbackDays[0]?.date ?? null);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    const targetMonth = toIsoMonth(new Date());
    setCalendarMonth(targetMonth);
    setCalendarDays([]);
    setSelectedDate(null);

    const controller = new AbortController();
    void loadCalendar(locationPreference, targetMonth, controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadCalendar, locationPreference]);

  useEffect(() => {
    if (calendarDays.length === 0) {
      setSelectedDate(null);
      return;
    }

    const today = toIsoDate(new Date());
    setSelectedDate((previousDate) => {
      if (previousDate && calendarDayMap.has(previousDate)) {
        return previousDate;
      }

      if (calendarDayMap.has(today)) {
        return today;
      }

      return calendarDays[0]?.date ?? null;
    });
  }, [calendarDayMap, calendarDays]);

  function onRetryCalendar() {
    if (!locationPreference) {
      return;
    }

    void loadCalendar(locationPreference, calendarMonth);
  }

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
          <p className="text-xs text-muted">{loading ? "Syncing month..." : "Tap a day"}</p>
        </div>
        {errorMessage && (
          <div className="mt-4 rounded-xl border border-red-300/40 bg-red-950/20 p-3" role="alert">
            <p className="text-sm text-red-100">{errorMessage}</p>
            {locationPreference && (
              <button
                className="mt-3 rounded-lg border border-red-200/40 px-3 py-2 text-xs text-red-100 transition hover:bg-red-900/25"
                onClick={onRetryCalendar}
                type="button"
              >
                Retry
              </button>
            )}
          </div>
        )}
        <div className="mt-4">
          <CalendarGrid
            days={calendarDays}
            month={calendarMonth}
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

function toIsoMonth(dateValue: Date): string {
  return dateValue.toISOString().slice(0, 7);
}

function toIsoDate(dateValue: Date): string {
  return dateValue.toISOString().slice(0, 10);
}

export default CalendarView;
