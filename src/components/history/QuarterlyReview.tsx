"use client";

import { useEffect, useMemo, useState } from "react";
import { todayStr } from "@/lib/date";
import { fetchGoalHistory, fetchZoneScores, fetchZones, historyEnabled } from "@/lib/db";
import {
  addMonths,
  goalsByQuarter,
  latestAndDelta,
  monthsBack,
  mostNeglected,
  parseDay,
  zoneSeries,
  type GoalRow,
} from "@/lib/history";
import { classifyLoadError, type LoadFailure } from "@/lib/loadError";
import { createClient } from "@/lib/supabase/client";
import { defaultZoneName, type Zone, type ZoneScore } from "@/lib/types";
import LoadError from "../LoadError";
import { monthShort } from "./format";
import SidePanel from "./SidePanel";
import ZoneSpark from "./ZoneSpark";

const LEVEL_TAG: Record<string, string> = {
  metas: "Mes",
  quarter_goals: "Trimestre",
  year_goals: "Ano",
  three_year_goals: "3 anos",
};

interface Loaded {
  zones: Zone[];
  scores: ZoneScore[];
  goals: GoalRow[] | null; // null = history not enabled yet
}

function GoalIcon({ status }: { status: GoalRow["status"] }) {
  if (status === "done") {
    return (
      <svg viewBox="0 0 14 14" className="mt-0.5 h-3.5 w-3.5 shrink-0" role="img" aria-label="Lograda">
        <circle cx="7" cy="7" r="7" fill="var(--color-ink)" />
        <path d="M4 7.2l2 2 4-4.2" fill="none" stroke="var(--color-paper)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "dropped") {
    return (
      <svg viewBox="0 0 14 14" className="mt-0.5 h-3.5 w-3.5 shrink-0" role="img" aria-label="Descartada">
        <circle cx="7" cy="7" r="6.2" fill="none" stroke="var(--color-heat-2)" strokeWidth="1.6" />
        <path d="M3 11L11 3" stroke="var(--color-heat-2)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 14 14" className="mt-0.5 h-3.5 w-3.5 shrink-0" role="img" aria-label="Abierta">
      <circle cx="7" cy="7" r="6.2" fill="none" stroke="var(--color-ink)" strokeWidth="1.6" />
    </svg>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{title}</h3>
        {note && <p className="mt-0.5 text-xs text-ink-3">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function QuarterlyReviewBody() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<LoadFailure | null>(null);
  const today = todayStr();
  const year = parseDay(today).getFullYear();

  useEffect(() => {
    let active = true;
    Promise.all([fetchZones(supabase), fetchZoneScores(supabase), historyEnabled(supabase)])
      .then(async ([zones, scores, enabled]) => {
        const goals = enabled
          ? await fetchGoalHistory(supabase, new Date(year, 0, 1).toISOString())
          : null;
        if (active) setData({ zones, scores, goals });
      })
      .catch((err) => {
        if (!active) return;
        console.error("[quarterly review] load failed", err);
        setError(classifyLoadError(err));
      });
    return () => {
      active = false;
    };
  }, [supabase, year]);

  if (error) return <LoadError kind={error} />;
  if (!data) return <div className="h-64 animate-pulse rounded-md bg-paper-2" aria-hidden="true" />;

  const thisMonth = addMonths(today, 0);
  const scoredThisMonth = data.scores.some((s) => s.month === thisMonth);
  const months = monthsBack(scoredThisMonth ? today : addMonths(today, -1), 6);
  const rows = data.zones.map((z) => {
    const series = zoneSeries(data.scores, z.id, months);
    return { zone: z, series, ...latestAndDelta(series) };
  });
  const worst = mostNeglected(rows.map((r) => r.delta));
  const anyScore = rows.some((r) => r.latest !== null);

  return (
    <div className="flex flex-col gap-8">
      <Section
        title="7 Zonas"
        note={`Puntaje de 1 a 10, ${monthShort(months[0])} a ${monthShort(months[months.length - 1])}. Resaltada: la zona que mas cayo en 3 meses.`}
      >
        {!anyScore ? (
          <p className="py-3 text-center text-sm text-ink-3">Todavia no hay puntajes. Se puntua en Monthly.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <caption className="sr-only">Zonas: tendencia de 6 meses</caption>
              <thead>
                <tr className="border-b border-line text-left text-[11px] text-ink-3">
                  <th className="py-1.5 font-normal">Zona</th>
                  <th className="py-1.5 font-normal">Tendencia</th>
                  <th className="py-1.5 text-right font-normal">Ultimo</th>
                  <th className="py-1.5 text-right font-normal">3 meses</th>
                  <th className="py-1.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const hot = i === worst;
                  const name = r.zone.name.trim() || defaultZoneName(r.zone.position);
                  return (
                    <tr key={r.zone.id} className="border-b border-line">
                      <td className={`py-2 pr-3 ${hot ? "font-semibold text-ink" : "text-ink"}`}>{name}</td>
                      <td className="py-2 pr-3">
                        <ZoneSpark
                          series={r.series}
                          width={180}
                          height={32}
                          emphasis={hot}
                          ariaLabel={`${name}: ${r.series.map((v, k) => `${monthShort(months[k])} ${v ?? "sin puntaje"}`).join(", ")}`}
                        />
                      </td>
                      <td className="py-2 text-right text-base font-semibold text-ink">{r.latest ?? "—"}</td>
                      <td className="py-2 text-right tabular-nums text-ink-2">
                        {r.delta === null ? "—" : r.delta > 0 ? `+${r.delta}` : r.delta < 0 ? `−${Math.abs(r.delta)}` : "0"}
                      </td>
                      <td className="py-2 pl-3">
                        {hot && (
                          <span className="whitespace-nowrap rounded-full border border-ink px-2 py-0.5 text-[11px] font-medium text-ink">
                            Mas desatendida
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={`Metas ${year}`}
        note="Logradas y descartadas, en el trimestre en que pasaron. Las abiertas, en el trimestre actual."
      >
        {data.goals === null ? (
          <LoadError kind="missing_schema" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {goalsByQuarter(data.goals, today).map((col) => {
              const done = col.goals.filter((g) => g.status === "done").length;
              const dropped = col.goals.filter((g) => g.status === "dropped").length;
              const open = col.goals.filter((g) => g.status === "open").length;
              const parts = [
                done ? `${done} ${done === 1 ? "lograda" : "logradas"}` : "",
                dropped ? `${dropped} ${dropped === 1 ? "descartada" : "descartadas"}` : "",
                open ? `${open} ${open === 1 ? "abierta" : "abiertas"}` : "",
              ].filter(Boolean);
              return (
                <div
                  key={col.q}
                  className={`flex flex-col gap-2.5 rounded-md border p-3 ${col.current ? "border-ink" : "border-line"}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">T{col.q} {year}</span>
                      {col.current && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink">Actual</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-2">{parts.length ? parts.join(" · ") : "Sin metas"}</p>
                  </div>
                  {col.goals.map((g) => (
                    <div key={g.id} className="flex items-start gap-2 text-[13px] leading-snug">
                      <GoalIcon status={g.status} />
                      <div className="min-w-0">
                        <p className={g.status === "dropped" ? "text-ink-3 line-through" : "text-ink"}>{g.text}</p>
                        <p className="text-[10px] text-ink-3">{LEVEL_TAG[g.category] ?? ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// The quarterly ritual's review: how the zones moved, and what happened to
// this year's goals.
export default function QuarterlyReview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
      >
        Revisar el trimestre
      </button>
      <SidePanel
        open={open}
        onClose={() => setOpen(false)}
        wide
        title="Revision del trimestre"
        subtitle="Como se movieron tus zonas y que paso con tus metas."
      >
        <QuarterlyReviewBody />
      </SidePanel>
    </>
  );
}
