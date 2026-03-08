import { render, screen } from "@testing-library/react";

import DailyHero from "../src/components/DailyHero";

describe("DailyHero", () => {
  it("renders the phase, zodiac, and vibe content", () => {
    render(
      <DailyHero
        illuminationPct={82.46}
        phaseName="Waning Gibbous"
        vibe="Reflection supports better pacing while depth over speed brings better results."
        zodiacSign="Scorpio"
      />,
    );

    expect(screen.getByRole("heading", { name: "Waning Gibbous" })).toBeInTheDocument();
    expect(screen.getByText("Zodiac:")).toBeInTheDocument();
    expect(screen.getByText("Scorpio")).toBeInTheDocument();
    expect(screen.getByText("Today's Vibe")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /waning gibbous moon phase/i })).toBeInTheDocument();
  });

  it("matches snapshot for visual regression safety", () => {
    const { asFragment } = render(
      <DailyHero
        illuminationPct={82.46}
        phaseName="Waning Gibbous"
        vibe="Reflection supports better pacing while depth over speed brings better results."
        zodiacSign="Scorpio"
      />,
    );

    expect(asFragment()).toMatchSnapshot();
  });
});
