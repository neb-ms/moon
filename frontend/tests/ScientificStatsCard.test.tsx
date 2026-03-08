import { render, screen } from "@testing-library/react";

import ScientificStatsCard from "../src/components/ScientificStatsCard";

describe("ScientificStatsCard", () => {
  it("renders placeholder values", () => {
    render(<ScientificStatsCard status="placeholder" />);

    expect(screen.getByText("Scientific Stats")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.getAllByText("--:--")).toHaveLength(2);
  });

  it("renders loading state labels", () => {
    render(<ScientificStatsCard status="loading" />);

    expect(screen.getAllByText("Loading...")).toHaveLength(3);
  });

  it("renders error state with fallback values and message", () => {
    render(<ScientificStatsCard errorMessage="Stats unavailable." status="error" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Stats unavailable.");
    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.getAllByText("--:--")).toHaveLength(2);
  });

  it("renders formatted ready values", () => {
    render(
      <ScientificStatsCard
        illuminationPct={82.46}
        moonriseLocal="2026-03-07T22:39:26.695968-05:00"
        moonsetLocal="2026-03-07T07:54:26.220278-05:00"
        status="ready"
      />,
    );

    expect(screen.getByText("82.5%")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
