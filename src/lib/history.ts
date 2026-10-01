// Pure helpers behind the timelines: dates, windows, streaks and groupings.
// No runtime imports on purpose, so this file can be exercised in plain Node.
// Dates are local-calendar strings (YYYY-MM-DD) throughout: a habit logged on
// someone's Tuesday stays on Tuesday whatever the server's time zone.
import type { GoalStatus, HabitPeriod } from "./types";

export type { GoalStatus };

export interface HabitLog {
  habit_id: string;
  day: string; // YYYY-MM-DD, the person's local date
  progress: number; // the window's progress as of that day
  target: number | null; // target at the time; null = checkbox habit
  completed: boolean;
}

export type Level = 0 | 1 | 2 | 3;

export interface WindowCell {
  start: string; // first day of the window (a day, a Monday, or the 1st)
  level: Level | null; // null = before recording began, or in the future
  future: boolean;
  log?: HabitLog;
}

export interface GoalRow {
  id: string;
  text: string;
  category: string;
  status: GoalStatus;
  status_at: string | null;
  archived_at: string | null;
}

// ---------------------------------------------------------------------------
// Calendar arithmetic on YYYY-MM-DD strings
// ---------------------------------------------------------------------------

export function parseDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dayStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(s: string, n: number): string {
  const d = parseDay(s);
  return dayStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

// First day of the month `n` months away from the month containing `s`.
export function addMonths(s: string, n: number): string {
  const d = parseDay(s);
  return dayStr(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function windowStart(period: HabitPeriod, s: string): string {
  const d = parseDay(s);
  if (period === "weekly") {
    const back = (d.getDay() + 6) % 7; // Monday = 0
    return dayStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back));
  }
  if (period === "monthly") return dayStr(new Date(d.getFullYear(), d.getMonth(), 1));
  return s;
}

export function nextWindowStart(period: HabitPeriod, start: string): string {
  if (period === "weekly") return addDays(start, 7);
  if (period === "monthly") return addMonths(start, 1);
  return addDays(start, 1);
}

export function prevWindowStart(period: HabitPeriod, start: string): string {
  if (period === "weekly") return addDays(start, -7);
  if (period === "monthly") return addMonths(start, -1);
  return addDays(start, -1);
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

// Intensity of one window. Checkbox habits are done or not; measurable habits
// shade by how close they got to the target that applied at the time. Any
// progress counts as done, matching the rest of the app.
export function levelOf(log?: HabitLog): Level {
  if (!log) return 0;
  if (log.target !== null && log.target > 0) {
    if (!(log.progress > 0)) return 0;
    const r = log.progress / log.target;
    return r >= 1 ? 3 : r >= 0.5 ? 2 : 1;
  }
  return log.completed ? 3 : 0;
}

// Logs for one habit, keyed by day.
function byDay(logs: HabitLog[]): Map<string, HabitLog> {
  const m = new Map<string, HabitLog>();
  for (const l of logs) m.set(l.day, l);
  return m;
}

// The entry that represents a window: the latest one inside it, because each
// entry holds the window's running total as of its day.
function windowLog(days: Map<string, HabitLog>, sortedDays: string[], start: string, end: string) {
  let found: HabitLog | undefined;
  for (const d of sortedDays) {
    if (d < start) continue;
    if (d >= end) break;
    found = days.get(d);
  }
  return found;
}

// `count` consecutive windows ending with the one that contains `today`.
export function habitWindows(
  logs: HabitLog[],
  period: HabitPeriod,
  today: string,
  count: number,
  dataSince: string
): WindowCell[] {
  const days = byDay(logs);
  const sorted = [...days.keys()].sort();
  const starts: string[] = [windowStart(period, today)];
  while (starts.length < count) starts.unshift(prevWindowStart(period, starts[0]));
  return starts.map((start) => {
    const end = nextWindowStart(period, start);
    if (addDays(end, -1) < dataSince) return { start, level: null, future: false };
    const log = windowLog(days, sorted, start, end);
    return { start, level: levelOf(log), future: false, log };
  });
}

// A Monday-to-Sunday calendar: `weeks` columns of 7 days, the last column
// holding `today`. Days after today are future; days before recording began
// carry no data rather than a fake "not done".
export function dailyCalendar(
  logs: HabitLog[],
  today: string,
  weeks: number,
  dataSince: string
): WindowCell[][] {
  const days = byDay(logs);
  const firstMonday = addDays(windowStart("weekly", today), -7 * (weeks - 1));
  const cols: WindowCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: WindowCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(firstMonday, w * 7 + d);
      if (day > today) col.push({ start: day, level: null, future: true });
      else if (day < dataSince) col.push({ start: day, level: null, future: false });
      else {
        const log = days.get(day);
        col.push({ start: day, level: levelOf(log), future: false, log });
      }
    }
    cols.push(col);
  }
  return cols;
}

// Consecutive done windows ending now. The current window only counts once it
// is done, so an unticked today does not break yesterday's streak.
export function streak(
  logs: HabitLog[],
  period: HabitPeriod,
  today: string,
  dataSince: string
): number {
  const days = byDay(logs);
  const sorted = [...days.keys()].sort();
  const floor = windowStart(period, dataSince);
  const done = (start: string) =>
    levelOf(windowLog(days, sorted, start, nextWindowStart(period, start))) > 0;
  let start = windowStart(period, today);
  if (!done(start)) start = prevWindowStart(period, start);
  let n = 0;
  while (start >= floor && done(start)) {
    n++;
    start = prevWindowStart(period, start);
  }
  return n;
}

// Done windows out of those that have data (past and present only).
export function doneRate(cells: WindowCell[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const c of cells) {
    if (c.future || c.level === null) continue;
    total++;
    if (c.level > 0) done++;
  }
  return { done, total };
}

// Rate over the windows in `cells` (oldest first, current last), where the
// current window counts only once it is done: an unfinished today is not a miss.
export function recentRate(cells: WindowCell[]): { done: number; total: number } {
  if (cells.length === 0) return { done: 0, total: 0 };
  const current = cells[cells.length - 1];
  const r = doneRate(cells.slice(0, -1));
  if (!current.future && current.level !== null && current.level > 0) {
    return { done: r.done + 1, total: r.total + 1 };
  }
  return r;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface WeekCount {
  start: string; // Monday
  count: number;
  current: boolean;
}

// Tasks completed per local week, for the `weeks` weeks ending this one.
// `completedAt` are ISO timestamps; each is placed on the viewer's calendar.
export function tasksPerWeek(completedAt: string[], today: string, weeks: number): WeekCount[] {
  const current = windowStart("weekly", today);
  const starts: string[] = [current];
  while (starts.length < weeks) starts.unshift(addDays(starts[0], -7));
  const counts = new Map(starts.map((s) => [s, 0]));
  for (const ts of completedAt) {
    const ws = windowStart("weekly", dayStr(new Date(ts)));
    if (counts.has(ws)) counts.set(ws, (counts.get(ws) ?? 0) + 1);
  }
  return starts.map((s) => ({ start: s, count: counts.get(s) ?? 0, current: s === current }));
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

// First-of-month strings, oldest first, ending with the month of `today`.
export function monthsBack(today: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addMonths(today, -i));
  return out;
}

export function zoneSeries(
  scores: { zone_id: string; month: string; score: number }[],
  zoneId: string,
  months: string[]
): (number | null)[] {
  const m = new Map<string, number>();
  for (const s of scores) if (s.zone_id === zoneId) m.set(s.month, s.score);
  return months.map((mo) => m.get(mo) ?? null);
}

// Latest score and its change over `span` months. Null when either end is missing.
export function latestAndDelta(series: (number | null)[], span = 3) {
  let last = -1;
  for (let i = series.length - 1; i >= 0; i--) if (series[i] !== null) { last = i; break; }
  if (last < 0) return { latest: null as number | null, delta: null as number | null };
  const ref = last - span >= 0 ? series[last - span] : null;
  const latest = series[last] as number;
  return { latest, delta: ref === null ? null : latest - ref };
}

// Index of the zone with the biggest drop, or -1 when none dropped.
export function mostNeglected(deltas: (number | null)[]): number {
  let idx = -1;
  let worst = 0;
  deltas.forEach((d, i) => {
    if (d !== null && d < worst) {
      worst = d;
      idx = i;
    }
  });
  return idx;
}

// Polyline segments for a sparkline on a fixed 1-10 scale. Gaps (months with
// no score) break the line instead of being drawn as zero.
export function sparkline(
  series: (number | null)[],
  width: number,
  height: number,
  pad = 5
): { segments: string[]; end: { x: number; y: number } | null } {
  const step = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0;
  const y = (v: number) => Math.round((height - pad - ((v - 1) / 9) * (height - pad * 2)) * 10) / 10;
  const segments: string[] = [];
  let run: string[] = [];
  let end: { x: number; y: number } | null = null;
  series.forEach((v, i) => {
    if (v === null) {
      if (run.length) segments.push(run.join(" "));
      run = [];
      return;
    }
    const x = Math.round((pad + i * step) * 10) / 10;
    run.push(`${x},${y(v)}`);
    end = { x, y: y(v) };
  });
  if (run.length) segments.push(run.join(" "));
  return { segments, end };
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export function quarterOf(d: Date): number {
  return Math.floor(d.getMonth() / 3) + 1;
}

export interface QuarterColumn {
  q: number;
  current: boolean;
  goals: GoalRow[];
}

// The four quarters of the year containing `today`. Achieved and dropped
// goals sit in the quarter they were resolved; open goals sit in the current
// quarter, since that is where they are still being worked on.
export function goalsByQuarter(goals: GoalRow[], today: string): QuarterColumn[] {
  const now = parseDay(today);
  const year = now.getFullYear();
  const currentQ = quarterOf(now);
  const cols: QuarterColumn[] = [1, 2, 3, 4].map((q) => ({ q, current: q === currentQ, goals: [] }));
  for (const g of goals) {
    if (g.status === "open") {
      if (!g.archived_at) cols[currentQ - 1].goals.push(g);
      continue;
    }
    if (!g.status_at) continue;
    const d = new Date(g.status_at);
    if (d.getFullYear() !== year) continue;
    cols[quarterOf(d) - 1].goals.push(g);
  }
  return cols;
}
