import { useEffect, useMemo, useRef, useState } from "react";

import type { CalendarPhaseDay } from "./CalendarGrid";

type DateDetailSheetProps = {
  day: CalendarPhaseDay;
  open: boolean;
  onClose: () => void;
  onExited: () => void;
};

const CLOSE_ANIMATION_MS = 220;
const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function DateDetailSheet({ day, open, onClose, onExited }: DateDetailSheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => {
        setVisible(true);
      });
      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    setVisible(false);
    const timeoutId = window.setTimeout(() => {
      setMounted(false);
      onExited();
    }, CLOSE_ANIMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onExited, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (activeElement === firstElement || !dialog.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement || !dialog.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  const formattedDate = useMemo(() => formatDate(day.date), [day.date]);
  const illuminationLabel = `${day.illuminationPct.toFixed(1)}%`;

  if (!mounted) {
    return null;
  }

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-30 flex items-end justify-center transition-opacity duration-200 ${
        visible ? "bg-black/70 opacity-100" : "bg-black/0 opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        aria-label="Moon details"
        aria-modal="true"
        className={`w-full max-w-md rounded-t-[1.4rem] border border-edge/80 bg-panel/95 p-5 shadow-panel transition-all duration-200 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Date Detail</p>
            <h2 className="mt-2 font-display text-2xl leading-tight">{formattedDate}</h2>
            <p className="mt-1 font-mono text-xs text-muted">{day.date}</p>
          </div>
          <button
            aria-label="Close details"
            className="rounded-full border border-edge/70 px-3 py-1 text-sm text-muted transition hover:border-accent/50 hover:text-text"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            X
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-edge/70 bg-bg/40 p-3 text-center">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Phase</dt>
            <dd className="mt-2 text-sm text-text">{day.phaseName}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Light</dt>
            <dd className="mt-2 text-sm text-text">{illuminationLabel}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Zodiac</dt>
            <dd className="mt-2 text-sm text-text">{day.zodiacSign}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export default DateDetailSheet;
