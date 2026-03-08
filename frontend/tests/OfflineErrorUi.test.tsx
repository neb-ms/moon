import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "../src/App";

function renderApp(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

function setOnlineStatus(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

describe("Offline and API failure UX", () => {
  beforeEach(() => {
    setOnlineStatus(true);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setOnlineStatus(true);
  });

  it("renders offline banner when the browser is offline", () => {
    setOnlineStatus(false);
    renderApp("/");

    expect(
      screen.getByText("You are offline. Showing saved content until your connection returns."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows API error toast after reconnect fails and allows dismiss", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("api down"));
    setOnlineStatus(false);

    renderApp("/");

    await act(async () => {
      setOnlineStatus(true);
      window.dispatchEvent(new Event("online"));
    });

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveTextContent("Project Lunar can't reach the API right now.");
    expect(fetchSpy).toHaveBeenCalledWith("/health", { cache: "no-store" });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("clears API error toast when retry succeeds", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("api down"))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    setOnlineStatus(false);
    renderApp("/");

    await act(async () => {
      setOnlineStatus(true);
      window.dispatchEvent(new Event("online"));
    });

    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
