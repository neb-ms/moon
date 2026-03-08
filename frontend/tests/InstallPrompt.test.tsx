import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "../src/App";
import { INSTALL_PROMPT_DISMISSED_KEY } from "../src/pwa/installPrompt";

function renderApp(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

async function dispatchInstallPromptEvent(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt") as BeforeInstallPromptEvent;
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome, platform: "web" });

  await act(async () => {
    window.dispatchEvent(event);
  });

  return event;
}

describe("Install prompt handling", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows install prompt and calls browser prompt handler", async () => {
    renderApp("/");
    const installEvent = await dispatchInstallPromptEvent("accepted");

    expect(await screen.findByRole("button", { name: "Install" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Install" }));

    await waitFor(() => {
      expect(installEvent.prompt).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByText("Install App")).not.toBeInTheDocument();
    });
  });

  it("persists dismissal when user chooses not to install", async () => {
    renderApp("/");
    await dispatchInstallPromptEvent("dismissed");

    expect(await screen.findByRole("button", { name: "Not now" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));

    await waitFor(() => {
      expect(screen.queryByText("Install App")).not.toBeInTheDocument();
    });

    expect(window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY)).toBe("true");

    await dispatchInstallPromptEvent("accepted");
    await waitFor(() => {
      expect(screen.queryByText("Install App")).not.toBeInTheDocument();
    });
  });
});
