import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "../src/App";

function renderApp(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App shell routing", () => {
  it("renders dashboard by default", async () => {
    renderApp("/");

    expect(await screen.findByRole("heading", { name: "Daily Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(await screen.findByText("Today's Moon")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /moon phase/i })).toBeInTheDocument();
  });

  it("renders calendar view for /calendar route", async () => {
    renderApp("/calendar");

    expect(await screen.findByRole("heading", { name: "Lunar Calendar" })).toBeInTheDocument();
    expect(await screen.findByText("Lunar Calendar Grid")).toBeInTheDocument();
  });
});
