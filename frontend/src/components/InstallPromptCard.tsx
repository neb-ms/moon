type InstallPromptCardProps = {
  onDismiss: () => void;
  onInstall: () => void;
  installing: boolean;
};

function InstallPromptCard({ onDismiss, onInstall, installing }: InstallPromptCardProps) {
  return (
    <article className="rounded-panel border border-edge/70 bg-panel-soft/85 p-4 shadow-panel">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Install App</p>
      <p className="mt-2 text-sm text-muted">
        Add Project Lunar to your home screen for fast daily access.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          className="rounded-lg border border-accent/70 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:border-accent"
          disabled={installing}
          onClick={onInstall}
          type="button"
        >
          {installing ? "Installing..." : "Install"}
        </button>
        <button
          className="rounded-lg border border-edge/70 px-4 py-2 text-sm text-text transition hover:border-accent/50"
          onClick={onDismiss}
          type="button"
        >
          Not now
        </button>
      </div>
    </article>
  );
}

export default InstallPromptCard;
