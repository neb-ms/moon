import { useState } from "react";

type ViewMode = "dashboard" | "calendar";

const stats = [
  { label: "Illumination", value: "-- %" },
  { label: "Moonrise", value: "--:--" },
  { label: "Moonset", value: "--:--" },
];

const calendarPreview = [
  { day: 1, phase: "new" },
  { day: 2, phase: "waxing" },
  { day: 3, phase: "waxing" },
  { day: 4, phase: "quarter" },
  { day: 5, phase: "gibbous" },
  { day: 6, phase: "full" },
  { day: 7, phase: "waning" },
];

function App() {
  const [view, setView] = useState<ViewMode>("dashboard");

  return (
    <div className="min-h-dvh bg-bg text-text">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-28 pt-6 sm:px-6">
        <header className="rounded-panel border border-edge/70 bg-panel/80 p-5 shadow-panel backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Project Lunar
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight">
            {view === "dashboard" ? "Daily Dashboard" : "Lunar Calendar"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Mobile-first shell with dark theme tokens, ready for API-driven lunar
            data.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              className={`rounded-full border px-4 py-2 text-sm transition ${
                view === "dashboard"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-edge/70 text-muted hover:border-accent/50 hover:text-text"
              }`}
              onClick={() => setView("dashboard")}
              type="button"
            >
              Dashboard
            </button>
            <button
              className={`rounded-full border px-4 py-2 text-sm transition ${
                view === "calendar"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-edge/70 text-muted hover:border-accent/50 hover:text-text"
              }`}
              onClick={() => setView("calendar")}
              type="button"
            >
              Calendar
            </button>
          </div>
        </header>

        {view === "dashboard" ? (
          <section className="mt-6 space-y-4">
            <article className="rounded-panel border border-edge/70 bg-panel-soft/85 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Hero Placeholder
              </p>
              <h2 className="mt-3 font-display text-2xl">Waxing Gibbous</h2>
              <p className="mt-1 text-sm text-muted">Zodiac: Leo</p>
              <p className="mt-4 rounded-xl border border-edge/70 bg-bg/50 p-3 text-sm leading-relaxed text-muted">
                Vibe placeholder: focus and momentum are building as light grows.
              </p>
            </article>

            <article className="rounded-panel border border-edge/70 bg-panel-soft/85 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Scientific Stats
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {stats.map((stat) => (
                  <div
                    className="rounded-xl border border-edge/70 bg-bg/60 p-3 text-center"
                    key={stat.label}
                  >
                    <p className="text-xs text-muted">{stat.label}</p>
                    <p className="mt-2 font-display text-lg">{stat.value}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        ) : (
          <section className="mt-6 rounded-panel border border-edge/70 bg-panel-soft/85 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Calendar Grid Placeholder
            </p>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {calendarPreview.map((entry) => (
                <button
                  className="aspect-square rounded-lg border border-edge/70 bg-bg/60 p-1 text-left text-xs text-muted transition hover:border-accent/60 hover:text-text"
                  key={entry.day}
                  type="button"
                >
                  <span className="block font-mono text-[10px]">{entry.day}</span>
                  <span className="mt-1 block truncate">{entry.phase}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <nav className="fixed bottom-4 left-1/2 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-full border border-edge/80 bg-panel/95 px-3 py-2 shadow-panel backdrop-blur">
          <ul className="flex items-center justify-between gap-2">
            <li className="flex-1">
              <button
                className={`w-full rounded-full px-3 py-2 text-sm transition ${
                  view === "dashboard"
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-text"
                }`}
                onClick={() => setView("dashboard")}
                type="button"
              >
                Home
              </button>
            </li>
            <li className="flex-1">
              <button
                className={`w-full rounded-full px-3 py-2 text-sm transition ${
                  view === "calendar"
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:text-text"
                }`}
                onClick={() => setView("calendar")}
                type="button"
              >
                Calendar
              </button>
            </li>
            <li className="flex-1">
              <button
                className="w-full rounded-full px-3 py-2 text-sm text-muted transition hover:text-text"
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

export default App;
