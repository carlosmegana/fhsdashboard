import type { WindowCell } from "@/lib/history";
import { cellClass } from "./heat";

// One cell per window (week or month), oldest first.
export default function WindowStrip({
  cells,
  describe,
  ariaLabel,
  cellClassName = "h-6 w-3.5",
}: {
  cells: WindowCell[];
  describe: (cell: WindowCell) => string;
  ariaLabel: string;
  cellClassName?: string;
}) {
  return (
    <div className="flex gap-[3px]" role="img" aria-label={ariaLabel}>
      {cells.map((cell) => (
        <span
          key={cell.start}
          title={describe(cell)}
          className={`block shrink-0 rounded-[3px] ${cellClassName} ${cellClass(cell.level, cell.future)}`}
        />
      ))}
    </div>
  );
}
