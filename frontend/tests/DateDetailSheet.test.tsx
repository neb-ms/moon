import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "../src/App";

function renderCalendarRoute() {
  return render(
    <MemoryRouter initialEntries={["/calendar"]}>
      <App />
    </MemoryRouter>,
  );
}

async function openDay(date: string) {
  const trigger = await screen.findByRole("button", {
    name: new RegExp(`select ${date}`, "i"),
  });
  fireEvent.click(trigger);
  return trigger;
}

describe("Date detail bottom sheet", () => {
  it("opens from a calendar day tap and closes with the X button", async () => {
    renderCalendarRoute();
    await openDay("2026-03-14");

    const dialog = await screen.findByRole("dialog", { name: "Moon details" });
    expect(within(dialog).getByText("Waning Gibbous")).toBeInTheDocument();
    expect(within(dialog).getByText("Scorpio")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close details" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Moon details" })).not.toBeInTheDocument();
    });
  });

  it("closes on Escape and returns focus to the selected day", async () => {
    renderCalendarRoute();
    const trigger = await openDay("2026-03-09");

    await screen.findByRole("dialog", { name: "Moon details" });
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Moon details" })).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it("keeps focus trapped inside the sheet on Tab navigation", async () => {
    renderCalendarRoute();
    await openDay("2026-03-22");

    const dialog = await screen.findByRole("dialog", { name: "Moon details" });
    const closeButton = within(dialog).getByRole("button", { name: "Close details" });

    await waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    fireEvent.keyDown(document, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(closeButton).toHaveFocus();
  });
});
