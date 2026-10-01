"use client";

// Marks a goal achieved (lograda) or back to open. Round, unlike the square
// task checkbox, because a goal is reached rather than ticked off.
export default function GoalCheckButton({
  done,
  label,
  onToggle,
}: {
  done: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      aria-label={done ? `${label}: lograda. Marcar como abierta` : `Marcar ${label} como lograda`}
      title={done ? "Lograda" : "Marcar como lograda"}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
        {done ? (
          <>
            <circle cx="8" cy="8" r="8" fill="var(--color-ink)" />
            <path d="M4.6 8.2l2.2 2.2 4.6-4.8" fill="none" stroke="var(--color-paper)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <circle cx="8" cy="8" r="7.1" fill="none" stroke="var(--color-line-2)" strokeWidth="1.6" />
        )}
      </svg>
    </button>
  );
}
