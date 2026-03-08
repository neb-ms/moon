type StatsStatus = "placeholder" | "loading" | "error" | "ready";

type ScientificStatsCardProps = {
  status: StatsStatus;
  illuminationPct?: number;
  moonriseLocal?: string | null;
  moonsetLocal?: string | null;
  errorMessage?: string;
  onRetry?: () => void;
};

type StatItem = {
  label: string;
  value: string;
};

const STATUS_NOTES: Record<StatsStatus, string> = {
  placeholder: "Pick a location to reveal tonight's lunar timings.",
  loading: "Calibrating moon trackers...",
  error: "Signal interrupted. Retry when ready.",
  ready: "Local moon telemetry is live.",
};

function formatTimeLabel(value?: string | null): string {
  if (!value) {
    return "No event";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function buildStatItems(props: ScientificStatsCardProps): StatItem[] {
  if (props.status === "ready") {
    return [
      {
        label: "Illumination",
        value: `${(props.illuminationPct ?? 0).toFixed(1)}%`,
      },
      {
        label: "Moonrise",
        value: formatTimeLabel(props.moonriseLocal),
      },
      {
        label: "Moonset",
        value: formatTimeLabel(props.moonsetLocal),
      },
    ];
  }

  if (props.status === "loading") {
    return [
      { label: "Illumination", value: "Loading..." },
      { label: "Moonrise", value: "Loading..." },
      { label: "Moonset", value: "Loading..." },
    ];
  }

  return [
    { label: "Illumination", value: "--" },
    { label: "Moonrise", value: "--:--" },
    { label: "Moonset", value: "--:--" },
  ];
}

function ScientificStatsCard(props: ScientificStatsCardProps) {
  const stats = buildStatItems(props);
  const statusNote = STATUS_NOTES[props.status];

  return (
    <article className="lunar-surface rounded-panel border border-edge/70 bg-panel-soft/85 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Scientific Stats</p>
        <p
          className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
            props.status === "error" ? "text-red-200" : "text-muted"
          }`}
        >
          {statusNote}
        </p>
      </div>

      {props.status === "error" && (
        <div
          className="mt-4 rounded-xl border border-red-300/40 bg-red-950/20 p-3"
          role="alert"
        >
          <p className="text-sm text-red-100">{props.errorMessage ?? "Unable to load lunar stats."}</p>
          {props.onRetry && (
            <button
              className="mt-3 rounded-lg border border-red-200/40 px-3 py-2 text-xs text-red-100 transition hover:bg-red-900/25"
              onClick={props.onRetry}
              type="button"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 min-[360px]:grid-cols-3">
        {stats.map((stat) => (
          <div
            className={`relative rounded-xl border border-edge/70 bg-bg/60 p-3 text-center transition duration-200 hover:-translate-y-[1px] hover:border-accent/50 ${
              props.status === "loading" ? "overflow-hidden" : ""
            }`}
            key={stat.label}
          >
            {props.status === "loading" && (
              <span aria-hidden="true" className="lunar-shimmer absolute inset-0 opacity-30" />
            )}
            <p className="text-xs text-muted">{stat.label}</p>
            <p className="mt-2 font-display text-lg text-text">{stat.value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export type { ScientificStatsCardProps, StatsStatus };
export default ScientificStatsCard;
