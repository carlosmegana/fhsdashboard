"use client";

import { useEffect, useMemo, useState } from "react";
import { todayStr } from "@/lib/date";
import {
  countStaleTasks,
  fetchActiveHabits,
  fetchHabitLogs,
  fetchHistorySince,
  fetchTaskCompletions,
  historyEnabled,
} from "@/lib/db";
import {
  addDays,
  dayStr,
  habitWindows,
  levelOf,
  parseDay,
  recentRate,
  tasksPerWeek,
  windowStart,
  type HabitLog,
  type WindowCell,
} from "@/lib/history";
import { classifyLoadError, type LoadFailure } from "@/lib/loadError";
import { createClient } from "@/lib/supabase/client";
import type { Habit } from "@/lib/types";
import LoadError from "../LoadError";
import { CADENCE_LABEL, dayLabel, longDate, monthLong, rateLabel, shortDate } from "./format";
import { HeatLegend } from "./heat";
import SidePanel from "./SidePanel";
import StatTile from "./StatTile";
import WeeklyBars from "./WeeklyBars";
import WindowStrip from "./WindowStrip";

const TASK_WEEKS = 8;

interface Loaded {
  habits: Habit[];
  logs: HabitLog[];
  since: string;
  completions: string[];
  stale: number;
}

function ReviewSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
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

function MonthlyReviewBody() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<LoadFailure | null>(null);
  const today = todayStr();

  useEffect(() => {
    let active = true;
    const firstTaskWeek = addDays(windowStart("weekly", today), -7 * (TASK_WEEKS - 1));
    historyEnabled(supabase)
      .then(async (enabled) => {
        if (!enabled) throw Object.assign(new Error("history not enabled"), { code: "42P01" });
        const [habits, logs, since, completions, stale] = await Promise.all([
          fetchActiveHabits(supabase),
          fetchHabitLogs(supabase, addDays(today, -200)),
          fetchHistorySince(supabase),
          fetchTaskCompletions(supabase, parseDay(firstTaskWeek).toISOString()),
          countStaleTasks(supabase, new Date(Date.now() - 14 * 86_400_000).toISOString()),
        ]);
        if (active) setData({ habits, logs, since, completions, stale });
      })
      .catch((err) => {
        if (!active) return;
        console.error("[monthly review] load failed", err);
        setError(classifyLoadError(err));
      });
    return () => {
      active = false;
    };
  }, [supabase, today]);

  if (error) return <LoadError kind={error} />;
  if (!data) return <div className="h-64 animate-pulse rounded-md bg-paper-2" aria-hidden="true" />;

  const from30 = addDays(today, -29);
  const last30 = data.completions.filter((ts) => dayStr(new Date(ts)) >= from30).length;
  const anyMeasurable = data.habits.some((h) => h.target !== undefined && h.target > 0);

  return (
    <div className="flex flex-col gap-8">
      <ReviewSection
        title="Keystone Habits"
        note="Diarios: ultimos 30 dias. Semanales: ultimas 8 semanas. Mensuales: ultimos 6 meses."
      >
        {data.habits.length === 0 ? (
          <p className="py-3 text-center text-sm text-ink-3">Todavia no tienes habitos.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.habits.map((h) => {
              const logs = data.logs.filter((l) => l.habit_id === h.id);
              const dataSince = h.createdOn && h.createdOn > data.since ? h.createdOn : data.since;
              const count = h.period === "daily" ? 30 : h.period === "weekly" ? 8 : 6;
              const cells = habitWindows(logs, h.period, today, count, dataSince);
              const rate = recentRate(cells);
              const describe = (c: WindowCell) => {
                const when =
                  h.period === "daily" ? dayLabel(c.start) : h.period === "weekly" ? `Semana del ${shortDate(c.start)}` : monthLong(c.start);
                if (c.level === null) return `${when} · sin registro`;
                if (c.log && c.log.target) return `${when} · ${c.log.progress} de ${c.log.target}`;
                return `${when} · ${levelOf(c.log) > 0 ? "hecho" : "no hecho"}`;
              };
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div className="w-40 min-w-0">
                    <p className="truncate text-[15px] text-ink">{h.text}</p>
                    <p className="text-[11px] text-ink-3">{CADENCE_LABEL[h.period]}</p>
                  </div>
                  <WindowStrip
                    cells={cells}
                    describe={describe}
                    cellClassName={h.period === "daily" ? "h-5 w-2.5" : "h-5 w-5"}
                    ariaLabel={`${h.text}: ${rateLabel(h.period, rate.done, rate.total)}`}
                  />
                  <p className="text-xs tabular-nums text-ink-2">{rateLabel(h.period, rate.done, rate.total)}</p>
                </li>
              );
            })}
          </ul>
        )}
        <HeatLegend measurable={anyMeasurable} />
      </ReviewSection>

      <ReviewSection title="Tareas" note={`Cuenta tareas completadas desde el ${longDate(data.since)}.`}>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Completadas, ultimos 30 dias" value={String(last30)} />
          <StatTile label="Abiertas hace mas de 14 dias" value={String(data.stale)} />
        </div>
        <WeeklyBars weeks={tasksPerWeek(data.completions, today, TASK_WEEKS)} />
      </ReviewSection>
    </div>
  );
}

// The monthly ritual's review: diagnose the month before planning the next.
export default function MonthlyReview() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
      >
        Revisar el mes
      </button>
      <SidePanel
        open={open}
        onClose={() => setOpen(false)}
        wide
        title="Revision del mes"
        subtitle="Diagnostica el mes antes de planear el siguiente."
      >
        <MonthlyReviewBody />
      </SidePanel>
    </>
  );
}
