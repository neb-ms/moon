type MoonCell = {
  key: string;
  inside: boolean;
  lit: boolean;
};

type BuildMoonCellsInput = {
  gridSize: number;
  phaseProgress: number;
};

function buildMoonCells({ gridSize, phaseProgress }: BuildMoonCellsInput): MoonCell[] {
  const normalizedProgress = ((phaseProgress % 1) + 1) % 1;
  const waxing = normalizedProgress <= 0.5;
  const angle = normalizedProgress * Math.PI * 2;
  const t = Math.cos(angle);
  const half = gridSize / 2;

  const cells: MoonCell[] = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const dx = (x + 0.5 - half) / half;
      const dy = (y + 0.5 - half) / half;
      const radial = dx * dx + dy * dy;
      const inside = radial <= 1;

      if (!inside) {
        cells.push({ key: `${x}-${y}`, inside: false, lit: false });
        continue;
      }

      const arc = Math.sqrt(Math.max(0, 1 - dy * dy));
      const terminator = waxing ? t * arc : -t * arc;
      const lit = waxing ? dx >= terminator : dx <= terminator;
      cells.push({ key: `${x}-${y}`, inside: true, lit });
    }
  }

  return cells;
}

export type { MoonCell };
export { buildMoonCells };
