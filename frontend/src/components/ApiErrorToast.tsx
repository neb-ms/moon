type ApiErrorToastProps = {
  message: string;
  onDismiss: () => void;
  onRetry: () => void;
  retrying: boolean;
};

function ApiErrorToast({ message, onDismiss, onRetry, retrying }: ApiErrorToastProps) {
  return (
    <div
      className="lunar-shell-enter fixed inset-x-0 top-3 z-30 mx-auto w-[calc(100%-1.5rem)] max-w-md rounded-xl border border-red-300/35 bg-red-950/90 p-3 shadow-panel backdrop-blur"
      role="alert"
    >
      <p className="text-sm text-red-100">{message}</p>
      <div className="mt-3 flex gap-2">
        <button
          className="rounded-lg border border-red-200/40 px-3 py-1 text-xs text-red-100 transition hover:bg-red-900/30"
          disabled={retrying}
          onClick={onRetry}
          type="button"
        >
          {retrying ? "Retrying..." : "Retry"}
        </button>
        <button
          className="rounded-lg border border-red-200/30 px-3 py-1 text-xs text-red-100/90 transition hover:bg-red-900/20"
          onClick={onDismiss}
          type="button"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default ApiErrorToast;
