"use client";

import { useEffect, useMemo, useState } from "react";
import { todayStr } from "@/lib/date";
import { fetchHabitLogs, fetchHistorySince, historyEnabled } from "@/lib/db";
import {
  addDays,
  dailyCalendar,
  parseDay,
  windowStart,
  habitWindows,
  levelOf,
  recentRate,
  streak,
  type HabitLog,
  type WindowCell,
} from "@/lib/history";
import { classifyLoadError, type LoadFailure } from "@/lib/loadError";
import { createClient } from "@/lib/supabase/client";
import type { Habit } from "@/lib/types";
import LoadError from "../LoadError";
import DayCalendar from "./DayCalendar";
import { CADENCE_LABEL, dayLabel, longDate, monthLong, rateLabel, shortDate, streakUnit } from "./format";
import { HeatLegend } from "./heat";
import SidePanel from "./SidePanel";
import StatTile from "./StatTile";
import WindowStrip from "./WindowStrip";

interface Loaded {
  logs: HabitLog[];
  since: string;
}

// Merges entries the Daily page just wrote (and may not have reached the
// database yet) over what was fetched, so the panel matches what was ticked.
function mergeLogs(fetched: HabitLog[], local: HabitLog[]): HabitLog[] {
  const m = new Map(fetched.map((l) => [l.day, l]));
  for (const l of local) m.set(l.day, l);
  return [...m.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}

function HabitHistoryBody({ habit, localLogs }: { habit: Habit; localLogs: HabitLog[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<LoadFailure | null>(null);
  const today = todayStr();

  useEffect(() => {
    let active = true;
    historyEnabled(supabase)
      .then(async (enabled) => {
        if (!enabled) throw Object.assign(new Error("history not enabled"), { code: "42P01" });
        const [since, logs] = await Promise.all([
          fetchHistorySince(supabase),
          fetchHabitLogs(supabase, addDays(today, -371), habit.id),
        ]);
        if (active) setData({ since, logs });
      })
      .catch((err) => {
        if (!active) return;
        console.error("[habit history] load failed", err);
        setError(classifyLoadError(err));
      });
    return () => {
      active = false;
    };
  }, [supabase, habit.id, today]);

  if (error) return <LoadError kind={error} />;
  if (!data) return <div className="h-48 animate-pulse rounded-md bg-paper-2" aria-hidden="true" />;

  const logs = mergeLogs(data.logs, localLogs);
  const dataSince = habit.createdOn && habit.createdOn > data.since ? habit.createdOn : data.since;
  const measurable = habit.target !== undefined && habit.target > 0;
  const n = streak(logs, habit.period, today, dataSince);
  const unit = streakUnit(habit.period, n);

  const describe = (cell: WindowCell) => {
    const when =
      habit.period === "daily"
        ? dayLabel(cell.start)
        : habit.period === "weekly"
          ? `Semana del ${shortDate(cell.start)}`
          : monthLong(cell.start);
    if (cell.level === null) return `${when} · sin registro`;
    if (measurable && cell.log && cell.log.target) {
      return `${when} · ${cell.log.progress} de ${cell.log.target}${habit.unit ? ` ${habit.unit}` : ""}`;
    }
    return `${when} · ${levelOf(cell.log) > 0 ? "hecho" : "no hecho"}`;
  };

  const rateWindows =
    habit.period === "daily"
      ? habitWindows(logs, "daily", today, 30, dataSince)
      : habit.period === "weekly"
        ? habitWindows(logs, "weekly", today, 12, dataSince)
        : habitWindows(logs, "monthly", today, 6, dataSince);
  const rate = recentRate(rateWindows);
  const rateTitle =
    habit.period === "daily" ? "Ultimos 30 dias" : habit.period === "weekly" ? "Ultimas 12 semanas" : "Ultimos 6 meses";

  const startsToday = dataSince >= today && logs.length === 0;
  // Show the weeks since recording began, at least 13 and at most 26, so a
  // new history is not a field of empty squares.
  const weeksOfData =
    Math.round(
      (parseDay(windowStart("weekly", today)).getTime() -
        parseDay(windowStart("weekly", dataSince)).getTime()) /
        (7 * 86_400_000)
    ) + 1;
  const calendarWeeks = Math.min(26, Math.max(13, weeksOfData));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Racha actual" value={`${n} ${unit.long}`} />
        <StatTile label={rateTitle} value={rate.total ? `${rate.done} de ${rate.total}` : "Sin datos"} />
      </div>

      {habit.period === "daily" ? (
        <DayCalendar
          cols={dailyCalendar(logs, today, calendarWeeks, dataSince)}
          describe={describe}
          ariaLabel={`${habit.text}, ultimas ${calendarWeeks} semanas. Racha actual ${n} ${unit.long}. ${rateTitle}: ${rateLabel(habit.period, rate.done, rate.total)}.`}
        />
      ) : (
        <WindowStrip
          cells={habitWindows(logs, habit.period, today, habit.period === "weekly" ? 26 : 12, dataSince)}
          describe={describe}
          cellClassName={habit.period === "weekly" ? "h-8 w-3.5" : "h-8 w-7"}
          ariaLabel={`${habit.text}, ${habit.period === "weekly" ? "ultimas 26 semanas" : "ultimos 12 meses"}. Racha actual ${n} ${unit.long}.`}
        />
      )}

      <HeatLegend measurable={measurable} />

      <p className="text-xs text-ink-3">
        {startsToday
          ? "El historial empieza hoy. Cada vez que marques este habito aparecera aqui."
          : `Historial desde el ${longDate(dataSince)}. Pasa el cursor sobre un cuadro para ver el detalle.`}
      </p>
    </div>
  );
}

// Side panel with one habit's timeline. Opened from the streak button on Daily.
export default function HabitHistoryPanel({
  habit,
  onClose,
  localLogs,
}: {
  habit: Habit | null;
  onClose: () => void;
  localLogs: HabitLog[];
}) {
  const measurable = habit?.target !== undefined && (habit?.target ?? 0) > 0;
  const subtitle = habit
    ? `${CADENCE_LABEL[habit.period]}${measurable ? ` · meta ${habit.target}${habit.unit ? ` ${habit.unit}` : ""}` : ""}`
    : "";
  return (
    <SidePanel open={habit !== null} onClose={onClose} title={habit?.text || "Habito"} subtitle={subtitle}>
      {habit && (
        <HabitHistoryBody
          habit={habit}
          localLogs={localLogs.filter((l) => l.habit_id === habit.id)}
        />
      )}
    </SidePanel>
  );
}
