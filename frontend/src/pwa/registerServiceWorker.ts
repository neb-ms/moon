type RegisterServiceWorkerOptions = {
  onReloadRequested?: () => void;
};

async function registerServiceWorker(
  options: RegisterServiceWorkerOptions = {},
): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const onReloadRequested = options.onReloadRequested ?? (() => window.location.reload());

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    promoteWaitingWorker(registration);
    attachUpdatePromotion(registration);
    attachControllerChangeReload(onReloadRequested);

    return registration;
  } catch (error) {
    console.error("Service worker registration failed", error);
    return null;
  }
}

function promoteWaitingWorker(registration: ServiceWorkerRegistration): void {
  registration.waiting?.postMessage({ type: "SKIP_WAITING" });
}

function attachUpdatePromotion(registration: ServiceWorkerRegistration): void {
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) {
      return;
    }

    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        promoteWaitingWorker(registration);
      }
    });
  });
}

let hasBoundControllerChange = false;

function attachControllerChangeReload(onReloadRequested: () => void): void {
  if (hasBoundControllerChange) {
    return;
  }

  hasBoundControllerChange = true;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    onReloadRequested();
  });
}

export type { RegisterServiceWorkerOptions };
export { registerServiceWorker };
