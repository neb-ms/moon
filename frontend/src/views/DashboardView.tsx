import DailyHero from "../components/DailyHero";
import ScientificStatsCard from "../components/ScientificStatsCard";

import { dashboardSample } from "./mockLunarData";

function DashboardView() {
  return (
    <div className="lunar-stagger space-y-4">
      <DailyHero
        illuminationPct={dashboardSample.illuminationPct}
        phaseName={dashboardSample.phaseName}
        vibe={dashboardSample.vibe}
        zodiacSign={dashboardSample.zodiacSign}
      />
      <ScientificStatsCard
        illuminationPct={dashboardSample.illuminationPct}
        moonriseLocal={dashboardSample.moonriseLocal}
        moonsetLocal={dashboardSample.moonsetLocal}
        status="ready"
      />
    </div>
  );
}

export default DashboardView;
