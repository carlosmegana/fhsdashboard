"use client";

import type { HabitPeriod } from "@/lib/types";
import { streakUnit } from "./format";

// The one quiet signal on the Daily page: a habit's current streak. Tapping it
// opens the habit's history. With no streak it shows just the icon.
export default function HabitStreakButton({
  count,
  period,
  habitName,
  onClick,
}: {
  count: number;
  period: HabitPeriod;
  habitName: string;
  onClick: () => void;
}) {
  const unit = streakUnit(period, count);
  const label =
    `Historial de ${habitName || "este habito"}` +
    (count > 0 ? `. Racha actual: ${count} ${unit.long}` : "");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 text-[11px] tabular-nums text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
        <rect x="1" y="1" width="4" height="4" rx="1" opacity="0.35" />
        <rect x="6" y="1" width="4" height="4" rx="1" opacity="0.6" />
        <rect x="11" y="1" width="4" height="4" rx="1" />
        <rect x="1" y="6" width="4" height="4" rx="1" opacity="0.6" />
        <rect x="6" y="6" width="4" height="4" rx="1" />
        <rect x="11" y="6" width="4" height="4" rx="1" />
        <rect x="1" y="11" width="4" height="4" rx="1" />
        <rect x="6" y="11" width="4" height="4" rx="1" />
        <rect x="11" y="11" width="4" height="4" rx="1" opacity="0.35" />
      </svg>
      {count > 0 && (
        <span>
          {count}
          {unit.short}
        </span>
      )}
    </button>
  );
}
