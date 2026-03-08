import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import ApiErrorToast from "./components/ApiErrorToast";
import CalendarGrid, { type CalendarPhaseDay } from "./components/CalendarGrid";
import DateDetailSheet from "./components/DateDetailSheet";
import DailyHero from "./components/DailyHero";
import InstallPromptCard from "./components/InstallPromptCard";
import LocationSetupCard from "./components/LocationSetupCard";
import OfflineBanner from "./components/OfflineBanner";
import ScientificStatsCard from "./components/ScientificStatsCard";
import { useConnectionStatus } from "./hooks/useConnectionStatus";
import {
  MANUAL_CITY_OPTIONS,
  clearLocationPreference,
  loadLocationPreference,
  saveLocationPreference,
  type LocationPreference,
} from "./location/locationPreference";
import {
  hasDismissedInstallPrompt,
  setDismissedInstallPrompt,
} from "./pwa/installPrompt";

const heroSample = {
  phaseName: "Waning Gibbous",
  zodiacSign: "Scorpio",
  illuminationPct: 82.46,
  moonriseLocal: "2026-03-07T22:39:26.695968-05:00",
  moonsetLocal: "2026-03-07T07:54:26.220278-05:00",
  vibe: "Reflection supports better pacing while depth over speed brings better results.",
};

const demoMonth = "2026-03";
const phaseCycle = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
];

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route element={<DashboardView />} index />
        <Route element={<CalendarView />} path="/calendar" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}

function AppShell() {
  const routeLocation = useLocation();
  const onDashboard = routeLocation.pathname === "/";
  const heading = onDashboard ? "Daily Dashboard" : "Lunar Calendar";
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);
  const [locationPreference, setLocationPreference] = useState<LocationPreference | null>(null);
  const [setupMode, setSetupMode] = useState<"prompt" | "manual">("prompt");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [requestingDeviceLocation, setRequestingDeviceLocation] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(true);
  const [installingApp, setInstallingApp] = useState(false);
  const [apiToastDismissed, setApiToastDismissed] = useState(false);
  const { apiErrorMessage, apiStatus, isOnline, retryConnection } = useConnectionStatus();
  const geolocationSupported = typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    const saved = loadLocationPreference();
    if (saved) {
      setLocationPreference(saved);
    }

    setHasLoadedPreference(true);
  }, []);

  useEffect(() => {
    setInstallPromptDismissed(hasDismissedInstallPrompt());

    function onBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault();
      setInstallPromptEvent(event);
      setInstallPromptDismissed(hasDismissedInstallPrompt());
    }

    function onAppInstalled() {
      setInstallPromptEvent(null);
      setDismissedInstallPrompt(false);
      setInstallPromptDismissed(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  function persistLocationPreference(nextPreference: LocationPreference) {
    setLocationPreference(nextPreference);
    saveLocationPreference(nextPreference);
    setSetupMode("prompt");
    setLocationMessage(null);
  }

  function onRequestDeviceLocation() {
    if (!geolocationSupported) {
      setSetupMode("manual");
      setLocationMessage("Device location is unavailable. Enter a location manually.");
      return;
    }

    setRequestingDeviceLocation(true);
    setLocationMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setRequestingDeviceLocation(false);
        persistLocationPreference({
          source: "device",
          label: formatCoordinateLabel(position.coords.latitude, position.coords.longitude),
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          updatedAt: new Date().toISOString(),
        });
      },
      (error) => {
        setRequestingDeviceLocation(false);
        setSetupMode("manual");
        setLocationMessage(getGeolocationErrorMessage(error.code));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }

  function onOpenManualEntry() {
    setSetupMode("manual");
    setLocationMessage(null);
  }

  function onSaveManualCity(cityId: string) {
    const city = MANUAL_CITY_OPTIONS.find((candidate) => candidate.id === cityId);
    if (!city) {
      setLocationMessage("Selected city is invalid. Please choose a city from the list.");
      return;
    }

    persistLocationPreference({
      source: "manual-city",
      label: city.label,
      lat: city.lat,
      lon: city.lon,
      updatedAt: new Date().toISOString(),
    });
  }

  function onSaveManualCoordinates(input: { label: string; lat: number; lon: number }) {
    const customLabel = input.label.trim();

    persistLocationPreference({
      source: "manual-coords",
      label: customLabel || formatCoordinateLabel(input.lat, input.lon),
      lat: input.lat,
      lon: input.lon,
      updatedAt: new Date().toISOString(),
    });
  }

  function onChangeLocation() {
    clearLocationPreference();
    setLocationPreference(null);
    setSetupMode("manual");
    setLocationMessage(null);
  }

  const showLocationSetup = hasLoadedPreference && locationPreference === null;
  const showInstallPrompt = installPromptEvent !== null && !installPromptDismissed;
  const showApiErrorToast = isOnline && apiErrorMessage !== null && !apiToastDismissed;

  useEffect(() => {
    if (apiErrorMessage) {
      setApiToastDismissed(false);
    }
  }, [apiErrorMessage]);

  function onDismissInstallPrompt() {
    setDismissedInstallPrompt(true);
    setInstallPromptDismissed(true);
  }

  async function onInstallApp() {
    if (!installPromptEvent) {
      return;
    }

    setInstallingApp(true);

    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;

      if (choice.outcome === "accepted") {
        setInstallPromptEvent(null);
        setDismissedInstallPrompt(false);
        setInstallPromptDismissed(false);
      } else {
        onDismissInstallPrompt();
      }
    } finally {
      setInstallingApp(false);
    }
  }

  function onRetryConnection() {
    void retryConnection();
  }

  function onDismissApiToast() {
    setApiToastDismissed(true);
  }

  return (
    <div className="min-h-dvh bg-bg text-text">
      {showApiErrorToast && (
        <ApiErrorToast
          message={apiErrorMessage ?? ""}
          onDismiss={onDismissApiToast}
          onRetry={onRetryConnection}
          retrying={apiStatus === "checking"}
        />
      )}
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-28 pt-6 sm:px-6">
        {!isOnline && (
          <OfflineBanner checking={apiStatus === "checking"} onRetry={onRetryConnection} />
        )}
        <header className="rounded-panel border border-edge/70 bg-panel/80 p-5 shadow-panel backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Project Lunar
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight">{heading}</h1>
          <p className="mt-2 text-sm text-muted">
            Mobile-first app shell with route state for dashboard and calendar views.
          </p>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-edge/70 bg-bg/35 px-3 py-2">
            <p className="text-xs text-muted">
              Location:{" "}
              <span className="font-mono text-text">
                {locationPreference ? locationPreference.label : "Not configured"}
              </span>
            </p>
            {locationPreference && (
              <button
                className="rounded-full border border-edge/70 px-3 py-1 text-xs text-muted transition hover:border-accent/50 hover:text-text"
                onClick={onChangeLocation}
                type="button"
              >
                Change
              </button>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <NavLink
              className={({ isActive }) =>
                `rounded-full border px-4 py-2 text-sm transition ${
                  isActive
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-edge/70 text-muted hover:border-accent/50 hover:text-text"
                }`
              }
              end
              to="/"
            >
              Dashboard
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `rounded-full border px-4 py-2 text-sm transition ${
                  isActive
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-edge/70 text-muted hover:border-accent/50 hover:text-text"
                }`
              }
              to="/calendar"
            >
              Calendar
            </NavLink>
          </div>
        </header>

        <section className="mt-6 flex-1 space-y-4">
          {showInstallPrompt && (
            <InstallPromptCard
              installing={installingApp}
              onDismiss={onDismissInstallPrompt}
              onInstall={onInstallApp}
            />
          )}
          {showLocationSetup && (
            <LocationSetupCard
              geolocationSupported={geolocationSupported}
              message={locationMessage}
              mode={setupMode}
              onOpenManualEntry={onOpenManualEntry}
              onRequestDeviceLocation={onRequestDeviceLocation}
              onSaveManualCity={onSaveManualCity}
              onSaveManualCoordinates={onSaveManualCoordinates}
              requestingDeviceLocation={requestingDeviceLocation}
            />
          )}
          <Outlet />
        </section>

        <nav
          aria-label="Primary navigation"
          className="fixed bottom-4 left-1/2 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-full border border-edge/80 bg-panel/95 px-3 py-2 shadow-panel backdrop-blur"
        >
          <ul className="flex items-center justify-between gap-2">
            <li className="flex-1">
              <NavLink
                className={({ isActive }) =>
                  `block w-full rounded-full px-3 py-2 text-center text-sm transition ${
                    isActive ? "bg-accent/15 text-accent" : "text-muted hover:text-text"
                  }`
                }
                end
                to="/"
              >
                Home
              </NavLink>
            </li>
            <li className="flex-1">
              <NavLink
                className={({ isActive }) =>
                  `block w-full rounded-full px-3 py-2 text-center text-sm transition ${
                    isActive ? "bg-accent/15 text-accent" : "text-muted hover:text-text"
                  }`
                }
                to="/calendar"
              >
                Calendar
              </NavLink>
            </li>
            <li className="flex-1">
              <button
                className="w-full rounded-full px-3 py-2 text-sm text-muted transition disabled:cursor-not-allowed disabled:opacity-60"
                disabled
                type="button"
              >
                Settings
              </button>
            </li>
          </ul>
        </nav>
      </main>
    </div>
  );
}

function DashboardView() {
  return (
    <div className="space-y-4">
      <DailyHero
        illuminationPct={heroSample.illuminationPct}
        phaseName={heroSample.phaseName}
        vibe={heroSample.vibe}
        zodiacSign={heroSample.zodiacSign}
      />
      <ScientificStatsCard
        illuminationPct={heroSample.illuminationPct}
        moonriseLocal={heroSample.moonriseLocal}
        moonsetLocal={heroSample.moonsetLocal}
        status="ready"
      />
    </div>
  );
}

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

  const detailDay = useMemo(() => {
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
      <article className="rounded-panel border border-edge/70 bg-panel-soft/85 p-5">
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

function formatCoordinateLabel(lat: number, lon: number): string {
  return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
}

function getGeolocationErrorMessage(errorCode: number): string {
  if (errorCode === 1) {
    return "Location permission was denied. Enter your location manually.";
  }

  if (errorCode === 2) {
    return "Your location could not be determined. Enter your location manually.";
  }

  if (errorCode === 3) {
    return "Location request timed out. Enter your location manually.";
  }

  return "Could not read device location. Enter your location manually.";
}

export default App;
