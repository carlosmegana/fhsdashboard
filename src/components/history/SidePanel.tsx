"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: ReactNode;
}

// Slide-in panel for timelines: details on demand, so the pages themselves
// stay uncluttered. A native modal <dialog> gives focus trapping, Escape to
// close and an inert background for free. Children mount only while open, so
// each opening loads fresh data.
export default function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  wide = false,
  children,
}: SidePanelProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // A click on the dialog box itself (not its content) is the backdrop.
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className={`m-0 ml-auto h-dvh max-h-dvh w-full border-0 border-l border-line bg-paper p-0 text-ink backdrop:bg-ink/20 ${
        wide ? "max-w-3xl" : "max-w-xl"
      }`}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
              {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-1 shrink-0 rounded-md p-1.5 text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
