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
  it("renders dashboard by default", () => {
    renderApp("/");

    expect(screen.getByRole("heading", { name: "Daily Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText("Today's Moon")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /moon phase/i })).toBeInTheDocument();
  });

  it("renders calendar view for /calendar route", () => {
    renderApp("/calendar");

    expect(screen.getByRole("heading", { name: "Lunar Calendar" })).toBeInTheDocument();
    expect(screen.getByText("Lunar Calendar Grid")).toBeInTheDocument();
  });
});
