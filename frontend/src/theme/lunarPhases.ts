export const phaseProgressByName: Record<string, number> = {
  "New Moon": 0,
  "Waxing Crescent": 0.125,
  "First Quarter": 0.25,
  "Waxing Gibbous": 0.375,
  "Full Moon": 0.5,
  "Waning Gibbous": 0.625,
  "Last Quarter": 0.75,
  "Waning Crescent": 0.875,
};

export function phaseNameToProgress(phaseName: string): number {
  return phaseProgressByName[phaseName] ?? 0;
}
