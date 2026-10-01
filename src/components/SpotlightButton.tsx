"use client";

interface SpotlightButtonProps {
  active: boolean;
  onToggle: () => void;
}

// Target icon that marks an issue as the one in focus. Like the note and delete
// buttons it appears on row hover on desktop, but stays visible when active and
// is always visible on touch screens.
export default function SpotlightButton({ active, onToggle }: SpotlightButtonProps) {
  return (
    <button
      type="button"
      aria-label={active ? "Quitar del foco" : "Poner en foco"}
      aria-pressed={active}
      title={active ? "Quitar del foco" : "Poner en foco"}
      onClick={onToggle}
      className={`shrink-0 p-1 transition-opacity ${
        active
          ? "text-ink"
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
        <circle cx="12" cy="12" r="8.25" />
        <circle cx="12" cy="12" r="4.25" />
        <circle
          cx="12"
          cy="12"
          r="1.5"
          fill={active ? "currentColor" : "none"}
        />
      </svg>
    </button>
  );
}
