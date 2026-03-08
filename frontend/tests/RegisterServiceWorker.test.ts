import { registerServiceWorker } from "../src/pwa/registerServiceWorker";

describe("registerServiceWorker", () => {
  it("registers service worker and promotes waiting workers", async () => {
    const postMessage = vi.fn();
    const waitingWorker = { postMessage } as unknown as ServiceWorker;
    const addEventListener = vi.fn();
    const register = vi.fn().mockResolvedValue({
      waiting: waitingWorker,
      installing: null,
      addEventListener,
    } as unknown as ServiceWorkerRegistration);

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register,
        controller: {},
        addEventListener: vi.fn(),
      },
    });

    const registration = await registerServiceWorker({ onReloadRequested: vi.fn() });

    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(registration).not.toBeNull();
  });

  it("returns null if registration throws", async () => {
    const register = vi.fn().mockRejectedValue(new Error("failed"));
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register,
        controller: null,
        addEventListener: vi.fn(),
      },
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await registerServiceWorker();

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
