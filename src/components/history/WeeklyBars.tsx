import type { WeekCount } from "@/lib/history";
import { shortDate } from "./format";

const HEIGHT = 140;

// Completed per week, one column each. Single series in ink; the week in
// progress is lighter. Only the peak and the current week carry a value label;
// every bar names its week and count on hover.
export default function WeeklyBars({ weeks }: { weeks: WeekCount[] }) {
  const max = Math.max(0, ...weeks.map((w) => w.count));
  const top = Math.max(4, Math.ceil(max / 2) * 2);
  const ticks = [0, top / 2, top];
  const peak = Math.max(0, ...weeks.filter((w) => !w.current).map((w) => w.count));
  const summary = weeks.map((w) => `${shortDate(w.start)}: ${w.count}`).join(", ");

  return (
    <div className="flex gap-2">
      <div className="relative w-5 shrink-0 text-[10px] tabular-nums text-ink-3" style={{ height: HEIGHT }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: HEIGHT - (t / top) * HEIGHT }}>
            {t}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: HEIGHT }} role="img" aria-label={`Completadas por semana. ${summary}.`}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-line" style={{ top: HEIGHT - (t / top) * HEIGHT }} />
          ))}
          <div className="absolute inset-0 flex items-end justify-around">
            {weeks.map((w) => {
              const label = w.current || (w.count > 0 && w.count === peak) ? String(w.count) : "";
              return (
                <div
                  key={w.start}
                  title={`Semana del ${shortDate(w.start)}: ${w.count} completadas${w.current ? " (en curso)" : ""}`}
                  className="flex h-full w-8 flex-col items-center justify-end gap-1"
                >
                  <span className="min-h-3.5 text-[11px] font-medium text-ink-2">{label}</span>
                  <div
                    className={`w-5 rounded-t ${w.current ? "bg-heat-1" : "bg-ink"}`}
                    style={{ height: Math.round((w.count / top) * HEIGHT) }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-1.5 flex justify-around">
          {weeks.map((w, i) => (
            <span key={w.start} className="w-8 whitespace-nowrap text-center text-[10px] text-ink-3">
              {(weeks.length - 1 - i) % 2 === 0 ? shortDate(w.start) : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
