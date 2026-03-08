import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { fetchDashboardData, type DashboardData } from "../api/moonApi";
import DailyHero from "../components/DailyHero";
import ScientificStatsCard, { type StatsStatus } from "../components/ScientificStatsCard";
import type { AppOutletContext } from "../location/appOutletContext";
import type { LocationPreference } from "../location/locationPreference";

const PLACEHOLDER_DASHBOARD: DashboardData = {
  date: "",
  phaseName: "Awaiting Location",
  illuminationPct: 0,
  moonriseLocal: null,
  moonsetLocal: null,
  zodiacSign: "Not set",
  vibe: "Choose a location to reveal your live moon guidance.",
};

const LOADING_DASHBOARD: DashboardData = {
  ...PLACEHOLDER_DASHBOARD,
  phaseName: "Loading Moon Data",
  vibe: "Calibrating local moon telemetry...",
};

const ERROR_DASHBOARD: DashboardData = {
  ...PLACEHOLDER_DASHBOARD,
  phaseName: "Data Unavailable",
  vibe: "Project Lunar could not load a fresh moon reading right now.",
};

function DashboardView() {
  const { locationPreference } = useOutletContext<AppOutletContext>();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async (preference: LocationPreference, signal?: AbortSignal) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const nextData = await fetchDashboardData(
        {
          lat: preference.lat,
          lon: preference.lon,
        },
        { signal },
      );
      setDashboardData(nextData);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Project Lunar could not load fresh moon data.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!locationPreference) {
      setDashboardData(null);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    const controller = new AbortController();
    void loadDashboard(locationPreference, controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadDashboard, locationPreference]);

  function onRetry() {
    if (!locationPreference) {
      return;
    }

    void loadDashboard(locationPreference);
  }

  const statsStatus = useMemo<StatsStatus>(() => {
    if (!locationPreference) {
      return "placeholder";
    }

    if (loading && dashboardData === null) {
      return "loading";
    }

    if (errorMessage && dashboardData === null) {
      return "error";
    }

    return "ready";
  }, [dashboardData, errorMessage, loading, locationPreference]);

  const heroData = useMemo<DashboardData>(() => {
    if (dashboardData) {
      return dashboardData;
    }

    if (loading) {
      return LOADING_DASHBOARD;
    }

    if (errorMessage) {
      return ERROR_DASHBOARD;
    }

    return PLACEHOLDER_DASHBOARD;
  }, [dashboardData, errorMessage, loading]);

  return (
    <div className="lunar-stagger space-y-4">
      <DailyHero
        illuminationPct={heroData.illuminationPct}
        phaseName={heroData.phaseName}
        vibe={heroData.vibe}
        zodiacSign={heroData.zodiacSign}
      />
      <ScientificStatsCard
        errorMessage={errorMessage ?? undefined}
        illuminationPct={dashboardData?.illuminationPct}
        moonriseLocal={dashboardData?.moonriseLocal}
        moonsetLocal={dashboardData?.moonsetLocal}
        onRetry={locationPreference ? onRetry : undefined}
        status={statsStatus}
      />
    </div>
  );
}

export default DashboardView;
