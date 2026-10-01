"use client";

import { useEffect, useRef } from "react";
import type { WindowCell } from "@/lib/history";
import { monthShort } from "./format";
import { cellClass } from "./heat";

const DAY_LETTERS = ["L", "", "X", "", "V", "", "D"];

// Monday-to-Sunday columns, one per week, with month labels above the week in
// which each month begins. Each cell names its day on hover.
export default function DayCalendar({
  cols,
  describe,
  ariaLabel,
}: {
  cols: WindowCell[][];
  describe: (cell: WindowCell) => string;
  ariaLabel: string;
}) {
  // On narrow screens the grid scrolls sideways; start at the newest weeks.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [cols.length]);

  // A label sits above the week in which each month begins. A label with the
  // next one fewer than 3 columns away is dropped, so they never run together.
  const starts = cols
    .map((col, i) => (i === 0 || monthShort(col[0].start) !== monthShort(cols[i - 1][0].start) ? i : -1))
    .filter((i) => i >= 0);
  const kept = new Set(starts.filter((i, k) => k === starts.length - 1 || starts[k + 1] - i >= 3));
  const monthLabels = cols.map((col, i) => (kept.has(i) ? monthShort(col[0].start) : ""));

  return (
    <div ref={scroller} className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-[3px] pl-4">
          {monthLabels.map((m, i) => (
            <span key={i} className="w-3 overflow-visible whitespace-nowrap text-[10px] text-ink-3">
              {m}
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <div className="flex w-3 flex-col gap-[3px] text-[9px] leading-3 text-ink-3" aria-hidden="true">
            {DAY_LETTERS.map((l, i) => (
              <span key={i} className="h-3">
                {l}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]" role="img" aria-label={ariaLabel}>
            {cols.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {col.map((cell) => (
                  <span
                    key={cell.start}
                    title={cell.future ? undefined : describe(cell)}
                    className={`block h-3 w-3 rounded-[3px] ${cellClass(cell.level, cell.future)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
