import { useCallback, useEffect, useState } from "react";

type ApiStatus = "idle" | "checking" | "ok" | "error";

type ConnectionStatus = {
  apiErrorMessage: string | null;
  apiStatus: ApiStatus;
  isOnline: boolean;
  retryConnection: () => Promise<void>;
};

async function pingApi(): Promise<void> {
  const response = await fetch("/health", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Health endpoint check failed.");
  }
}

function useConnectionStatus(): ConnectionStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("idle");
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const runConnectionCheck = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setApiStatus("idle");
      setApiErrorMessage(null);
      return;
    }

    setIsOnline(true);
    setApiStatus("checking");

    try {
      await pingApi();
      setApiStatus("ok");
      setApiErrorMessage(null);
    } catch {
      setApiStatus("error");
      setApiErrorMessage(
        "Project Lunar can't reach the API right now. Your last cached view is still available.",
      );
    }
  }, []);

  useEffect(() => {
    function onOnline() {
      setIsOnline(true);
      void runConnectionCheck();
    }

    function onOffline() {
      setIsOnline(false);
      setApiStatus("idle");
      setApiErrorMessage(null);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [runConnectionCheck]);

  return {
    apiErrorMessage,
    apiStatus,
    isOnline,
    retryConnection: runConnectionCheck,
  };
}

export type { ApiStatus, ConnectionStatus };
export { useConnectionStatus };
