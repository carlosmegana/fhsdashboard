"use client";

import { todayStr } from "@/lib/date";
import { addMonths, latestAndDelta, monthsBack, zoneSeries } from "@/lib/history";
import type { Zone, ZoneScore } from "@/lib/types";
import { monthLong, monthShort } from "./format";
import SidePanel from "./SidePanel";
import StatTile from "./StatTile";
import ZoneSpark from "./ZoneSpark";

const WIDTH = 480;

function ZoneHistoryBody({ zone, scores }: { zone: Zone; scores: ZoneScore[] }) {
  // From the first scored month to the latest one, at least 6 and at most 12.
  const own = scores.filter((s) => s.zone_id === zone.id).map((s) => s.month).sort();
  const last = own.length ? own[own.length - 1] : addMonths(todayStr(), 0);
  const first = own.length ? own[0] : last;
  const span =
    (Number(last.slice(0, 4)) - Number(first.slice(0, 4))) * 12 +
    (Number(last.slice(5, 7)) - Number(first.slice(5, 7))) +
    1;
  const months = monthsBack(last, Math.min(12, Math.max(6, span)));
  const series = zoneSeries(scores, zone.id, months);
  const { latest, delta } = latestAndDelta(series);
  const scored = months
    .map((m, i) => ({ month: m, score: series[i] }))
    .filter((r) => r.score !== null)
    .reverse();

  if (scored.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-3">Sin puntajes todavia. Se puntua en Monthly.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Ultimo puntaje" value={latest === null ? "—" : `${latest} de 10`} />
        <StatTile
          label="Cambio en 3 meses"
          value={delta === null ? "Sin datos" : delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : "0"}
        />
      </div>

      <div className="overflow-x-auto">
        <ZoneSpark
          series={series}
          width={WIDTH}
          height={120}
          emphasis
          ariaLabel={`${zone.name}: ${scored.map((r) => `${monthLong(r.month)} ${r.score}`).join(", ")}`}
        />
        <div className="mt-1 flex justify-between text-[10px] text-ink-3" style={{ width: WIDTH }}>
          {months.map((m, i) => (
            <span key={m}>{months.length <= 6 || (months.length - 1 - i) % 2 === 0 ? monthShort(m) : ""}</span>
          ))}
        </div>
      </div>

      <table className="w-full text-sm">
        <caption className="sr-only">Puntajes por mes</caption>
        <thead>
          <tr className="border-b border-line text-left text-[11px] text-ink-3">
            <th className="py-1.5 font-normal">Mes</th>
            <th className="py-1.5 text-right font-normal">Puntaje</th>
          </tr>
        </thead>
        <tbody>
          {scored.map((r) => (
            <tr key={r.month} className="border-b border-line">
              <td className="py-1.5 text-ink">{monthLong(r.month)}</td>
              <td className="py-1.5 text-right tabular-nums text-ink">{r.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// One zone's scores over the last 12 months. Uses data the zones card already
// holds, so it opens instantly and works before the history update.
export default function ZoneHistoryPanel({
  zone,
  scores,
  onClose,
}: {
  zone: Zone | null;
  scores: ZoneScore[];
  onClose: () => void;
}) {
  return (
    <SidePanel open={zone !== null} onClose={onClose} title={zone?.name || "Zona"} subtitle="Puntaje de 1 a 10 por mes.">
      {zone && <ZoneHistoryBody zone={zone} scores={scores} />}
    </SidePanel>
  );
}
