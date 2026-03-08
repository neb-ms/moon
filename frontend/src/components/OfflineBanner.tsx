type OfflineBannerProps = {
  checking: boolean;
  onRetry: () => void;
};

function OfflineBanner({ checking, onRetry }: OfflineBannerProps) {
  return (
    <div
      className="lunar-shell-enter sticky top-2 z-20 rounded-xl border border-amber-300/30 bg-amber-950/50 px-3 py-2 backdrop-blur"
      role="status"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-amber-100">
          You are offline. Showing saved content until your connection returns.
        </p>
        <button
          className="shrink-0 rounded-lg border border-amber-200/40 px-3 py-1 text-xs text-amber-100 transition hover:bg-amber-900/40"
          disabled={checking}
          onClick={onRetry}
          type="button"
        >
          {checking ? "Checking..." : "Retry"}
        </button>
      </div>
    </div>
  );
}

export default OfflineBanner;
