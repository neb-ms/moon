import { useMemo } from "react";
import { buildMoonCells } from "../theme/moonPixels";

type PixelMoonProps = {
  phaseName: string;
  phaseProgress: number;
};

const GRID_SIZE = 12;

function PixelMoon({ phaseName, phaseProgress }: PixelMoonProps) {
  const cells = useMemo(
    () => buildMoonCells({ gridSize: GRID_SIZE, phaseProgress }),
    [phaseProgress],
  );

  return (
    <div className="relative mx-auto w-[140px] shrink-0">
      <div className="pointer-events-none absolute inset-0 rounded-[20px] bg-accent/10 blur-xl" />
      <div
        aria-label={`${phaseName} moon phase`}
        className="relative rounded-[20px] border border-edge/80 bg-bg/70 p-3"
        data-testid="pixel-moon"
        role="img"
      >
        <div
          className="grid gap-[2px]"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
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
                data-inside={cell.inside ? "true" : "false"}
                data-lit={cell.lit ? "true" : "false"}
                key={cell.key}
                style={{ backgroundColor }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PixelMoon;
