import PixelMoon from "./PixelMoon";
import { phaseNameToProgress } from "../theme/lunarPhases";

type DailyHeroProps = {
  phaseName: string;
  zodiacSign: string;
  vibe: string;
  illuminationPct: number;
};

function DailyHero({ phaseName, zodiacSign, vibe, illuminationPct }: DailyHeroProps) {
  return (
    <article className="lunar-surface rounded-panel border border-edge/70 bg-panel-soft/85 p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="lunar-float">
          <PixelMoon phaseName={phaseName} phaseProgress={phaseNameToProgress(phaseName)} />
        </div>

        <div className="text-center sm:text-left">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Today&apos;s Moon
          </p>
          <h2 className="mt-2 font-display text-4xl leading-tight tracking-tight">{phaseName}</h2>
          <p className="mt-2 text-lg font-medium text-text">
            Zodiac: <span className="text-accent">{zodiacSign}</span>
          </p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.14em] text-muted">
            {illuminationPct.toFixed(1)}% illuminated
          </p>
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full border border-edge/60 bg-bg/60 sm:mx-0"
          >
            <span
              className="block h-full rounded-full bg-gradient-to-r from-accent to-accent-warm transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, illuminationPct))}%` }}
            />
          </div>
        </div>
      </div>

      <section
        aria-label="Daily vibe"
        className="mt-5 rounded-2xl border border-edge/70 bg-bg/60 p-4"
      >
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-warm">
          Today&apos;s Vibe
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text">{vibe}</p>
      </section>
    </article>
  );
}

export default DailyHero;
