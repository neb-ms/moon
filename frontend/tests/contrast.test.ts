import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Rgb = [number, number, number];

function parseRgbToken(css: string, token: string): Rgb {
  const match = css.match(new RegExp(`--${token}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+);`));
  if (!match) {
    throw new Error(`Missing color token: ${token}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function relativeLuminance([r, g, b]: Rgb): number {
  const convert = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const bright = Math.max(relativeLuminance(a), relativeLuminance(b));
  const dark = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (bright + 0.05) / (dark + 0.05);
}

describe("Theme contrast", () => {
  it("keeps primary dashboard text colors readable against dark backgrounds", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf-8");

    const text = parseRgbToken(css, "color-text");
    const muted = parseRgbToken(css, "color-muted");
    const bg = parseRgbToken(css, "color-bg");
    const panelSoft = parseRgbToken(css, "color-panel-soft");

    expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(muted, panelSoft)).toBeGreaterThanOrEqual(4.5);
  });
});
