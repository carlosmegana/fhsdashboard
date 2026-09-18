"use client";

interface NoteButtonProps {
  hasNote: boolean;
  open: boolean;
  onToggle: () => void;
}

export default function NoteButton({ hasNote, open, onToggle }: NoteButtonProps) {
  return (
    <button
      type="button"
      aria-label={hasNote ? (open ? "Ocultar nota" : "Ver nota") : "Agregar nota"}
      aria-expanded={open}
      onClick={onToggle}
      className={`shrink-0 p-1 transition-opacity ${
        hasNote
          ? "text-ink hover:text-ink"
          : "text-ink-3 hover:text-ink md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-9a2.25 2.25 0 00-2.25-2.25h-10.5A2.25 2.25 0 004.5 5.25v13.5A2.25 2.25 0 006.75 21h7.5m5.25-6.75l-6.75 6.75m6.75-6.75h-4.5a2.25 2.25 0 00-2.25 2.25V21"
        />
      </svg>
    </button>
  );
}
