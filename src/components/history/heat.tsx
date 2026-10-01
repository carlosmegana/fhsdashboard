import type { Level } from "@/lib/history";

// Literal class names so Tailwind generates them. One tone, light to dark.
const LEVEL_BG = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3"] as const;

// A timeline cell: future cells are invisible, cells before recording began
// are a dashed outline (no data, which is not the same as "not done").
export function cellClass(level: Level | null, future: boolean): string {
  if (future) return "bg-transparent";
  if (level === null) return "border border-line bg-transparent";
  return LEVEL_BG[level];
}

function Swatch({ className }: { className: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-[3px] ${className}`} />;
}

// Legend: two states for checkbox habits, four steps for measurable ones.
export function HeatLegend({ measurable }: { measurable: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
      <span className="flex items-center gap-1.5">
        <Swatch className={cellClass(null, false)} />
        Sin registro
      </span>
      {measurable ? (
        <span className="flex items-center gap-1.5">
          Nada
          <Swatch className={cellClass(0, false)} />
          <Swatch className={cellClass(1, false)} />
          <Swatch className={cellClass(2, false)} />
          <Swatch className={cellClass(3, false)} />
          Meta completa
        </span>
      ) : (
        <>
          <span className="flex items-center gap-1.5">
            <Swatch className={cellClass(0, false)} />
            No hecho
          </span>
          <span className="flex items-center gap-1.5">
            <Swatch className={cellClass(3, false)} />
            Hecho
          </span>
        </>
      )}
    </div>
  );
}
