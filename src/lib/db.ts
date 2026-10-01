import type { SupabaseClient } from "@supabase/supabase-js";
import { periodStartStr, todayStr } from "./date";
import type { GoalRow, HabitLog } from "./history";
import { dayStr } from "./history";
import { classifyLoadError } from "./loadError";
import type {
  Categories,
  CategoryKey,
  GoalStatus,
  Habit,
  HabitPeriod,
  ItemCategory,
  PgcData,
  TextItem,
  Zone,
  ZoneScore,
} from "./types";
import {
  DAILY_CATEGORIES,
  GOAL_CATEGORIES,
  HISTORY_CATEGORIES,
  defaultZoneName,
} from "./types";

// Data access layer backing the dashboard with Supabase Postgres (replaces the
// old localStorage `storage.ts`). Every function takes the browser client and
// operates only on the signed-in user's rows — Row Level Security enforces that
// server-side, and `user_id` defaults to `auth.uid()` so inserts omit it.

interface ItemRow {
  id: string;
  category: CategoryKey;
  text: string;
  completed: boolean;
  note: string | null;
  created_at: string;
  // Habit-only columns (defaults present on every row; ignored off keystone_habits).
  target: number | null;
  unit: string | null;
  step: number;
  progress: number;
  period: HabitPeriod;
  period_start: string; // YYYY-MM-DD
  status?: GoalStatus; // present once migration 0008 is applied
}

const ITEM_COLUMNS =
  "id, category, text, completed, note, created_at, target, unit, step, progress, period, period_start";
const ITEM_COLUMNS_WITH_HISTORY = `${ITEM_COLUMNS}, status`;

// ---------------------------------------------------------------------------
// History switch
// ---------------------------------------------------------------------------
// Migrations are applied by hand, and Vercel deploys code the moment it is
// pushed, so the app must keep working on a database that has not received
// 0008 yet. This asks the database once per page load whether the history
// table exists. Without it, everything behaves as before 0008 (no archiving,
// no habit log, no goal status) and the timeline views say what is missing.
let historyProbe: Promise<boolean> | null = null;

export function historyEnabled(supabase: SupabaseClient): Promise<boolean> {
  if (!historyProbe) {
    historyProbe = (async () => {
      const { error } = await supabase.from("habit_logs").select("day").limit(1);
      if (!error) return true;
      if (classifyLoadError(error) === "missing_schema") return false;
      throw error;
    })();
    // A network blip must not pin the answer for the whole session.
    historyProbe.catch(() => {
      historyProbe = null;
    });
  }
  return historyProbe;
}

// PostgREST caps a response at 1000 rows (Supabase default), silently. Every
// history read that can grow goes through this, one page at a time.
async function selectAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const SIZE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += SIZE) {
    const { data, error } = await page(from, from + SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < SIZE) return out;
  }
}

function emptyCategories(): Categories {
  return {
    keystone_habits: [],
    valores: [],
    metas: [],
    tasks: [],
  };
}

// Builds the UI-facing Habit from a row: measurable fields are only attached when
// present (target NULL => plain checkbox habit). numeric columns arrive as numbers
// from PostgREST but are coerced defensively.
function toHabit(row: ItemRow): Habit {
  const habit: Habit = {
    id: row.id,
    text: row.text,
    completed: row.completed,
    step: Number(row.step),
    progress: Number(row.progress),
    period: row.period,
  };
  if (row.note) habit.note = row.note;
  if (row.target !== null && row.target !== undefined) {
    habit.target = Number(row.target);
  }
  if (row.unit) habit.unit = row.unit;
  if (row.created_at) habit.createdOn = dayStr(new Date(row.created_at));
  return habit;
}

// Groups flat item rows into the five category arrays the UI expects. Rows arrive
// already ordered by (category, created_at) from the query.
function groupRows(rows: ItemRow[]): Categories {
  const categories = emptyCategories();
  for (const row of rows) {
    if (row.category === "keystone_habits") {
      categories.keystone_habits.push(toHabit(row));
      continue;
    }
    const base: TextItem = { id: row.id, text: row.text };
    if (row.status && GOAL_CATEGORIES.has(row.category)) base.status = row.status;
    const withNote = row.note ? { ...base, note: row.note } : base;
    if (row.category === "tasks") {
      categories.tasks.push({ ...withNote, completed: row.completed });
    } else {
      categories[row.category].push(withNote);
    }
  }
  return categories;
}

// Minimal shape needed to decide and apply a period reset.
interface ResettableHabit {
  id: string;
  period: HabitPeriod;
  period_start: string;
  progress: number;
  completed: boolean;
}

// Per-habit, cadence-aware reset (replaces the old global daily reset). For each
// habit, if the start of the window that contains today has moved past the stored
// `period_start`, the habit is reset (progress -> 0, completed -> false) and the
// anchor advances. Mutates the passed rows in place so callers can reflect the
// reset without re-fetching, and returns whether anything reset.
async function applyDueResets(
  supabase: SupabaseClient,
  habits: ResettableHabit[]
): Promise<boolean> {
  const now = new Date();
  const writes: PromiseLike<unknown>[] = [];
  for (const habit of habits) {
    const start = periodStartStr(habit.period, now);
    if (start !== habit.period_start) {
      habit.progress = 0;
      habit.completed = false;
      habit.period_start = start;
      writes.push(
        supabase
          .from("items")
          .update({ progress: 0, completed: false, period_start: start })
          .eq("id", habit.id)
      );
    }
  }
  if (writes.length > 0) await Promise.all(writes);
  return writes.length > 0;
}

// Loads the full dashboard for the signed-in user. Fetches every row once, then
// applies any due per-habit resets in place before grouping, so the returned data
// already reflects the reset without a second read.
export async function fetchDashboard(
  supabase: SupabaseClient
): Promise<PgcData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { lastActiveDate: todayStr(), categories: emptyCategories() };

  const history = await historyEnabled(supabase);
  let query = supabase
    .from("items")
    .select(history ? ITEM_COLUMNS_WITH_HISTORY : ITEM_COLUMNS)
    .in("category", DAILY_CATEGORIES);
  if (history) query = query.is("archived_at", null);
  const { data, error } = await query
    .order("category", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as unknown as ItemRow[];
  await applyDueResets(
    supabase,
    rows.filter((r) => r.category === "keystone_habits")
  );

  return {
    lastActiveDate: todayStr(),
    categories: groupRows(rows),
  };
}

// Re-runs the per-habit reset check (used when a tab regains focus, e.g. left open
// past midnight or across a week/month boundary). Returns true if any habit reset,
// so the caller can refresh its state.
export async function runDailyResetIfNeeded(
  supabase: SupabaseClient
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  let query = supabase
    .from("items")
    .select("id, period, period_start, progress, completed")
    .eq("category", "keystone_habits");
  if (await historyEnabled(supabase)) query = query.is("archived_at", null);
  const { data } = await query;

  return applyDueResets(supabase, (data ?? []) as ResettableHabit[]);
}

// Plain text items for one category (the lists on the Weekly / Monthly /
// Quarterly pages). `weekStart` narrows to one week for friction items.
export async function fetchItems(
  supabase: SupabaseClient,
  category: ItemCategory,
  weekStart?: string
): Promise<TextItem[]> {
  const history = await historyEnabled(supabase);
  let query = supabase
    .from("items")
    .select(history ? "id, text, note, created_at, status" : "id, text, note, created_at")
    .eq("category", category);
  if (weekStart) query = query.eq("week_start", weekStart);
  if (history) query = query.is("archived_at", null);
  const { data, error } = await query
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    id: string;
    text: string;
    note: string | null;
    status?: GoalStatus;
  }[];
  return rows.map((row) => {
    const item: TextItem = { id: row.id, text: row.text };
    if (row.note) item.note = row.note;
    if (row.status && GOAL_CATEGORIES.has(category)) item.status = row.status;
    return item;
  });
}

// Inserts a new item on its first real text save. Brand-new items live only in
// local state until then, so cancelled/empty adds never touch the DB.
export async function insertItem(
  supabase: SupabaseClient,
  id: string,
  category: ItemCategory,
  text: string,
  extra: { week_start?: string } = {}
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .insert({ id, category, text, ...extra });
  if (error) throw error;
}

export async function updateItemText(
  supabase: SupabaseClient,
  id: string,
  text: string
): Promise<void> {
  const { error } = await supabase.from("items").update({ text }).eq("id", id);
  if (error) throw error;
}

export async function setItemCompleted(
  supabase: SupabaseClient,
  id: string,
  completed: boolean
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ completed })
    .eq("id", id);
  if (error) throw error;
}

// Sets a measurable habit's logged amount for the current window. `completed`
// mirrors "any progress counts as done", so partial progress still marks the day.
export async function setItemProgress(
  supabase: SupabaseClient,
  id: string,
  progress: number
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ progress, completed: progress > 0 })
    .eq("id", id);
  if (error) throw error;
}

// Updates a habit's measurable config. Passing target=null reverts it to a plain
// checkbox habit. period_start is realigned to the current window for the chosen
// cadence so a cadence change never triggers a spurious reset (progress is kept).
export async function setHabitConfig(
  supabase: SupabaseClient,
  id: string,
  config: { target: number | null; unit: string | null; step: number; period: HabitPeriod }
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({
      target: config.target,
      unit: config.unit,
      step: config.step,
      period: config.period,
      period_start: periodStartStr(config.period),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setItemNote(
  supabase: SupabaseClient,
  id: string,
  note: string | null
): Promise<void> {
  const { error } = await supabase.from("items").update({ note }).eq("id", id);
  if (error) throw error;
}

export async function deleteItem(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}

// What the trash button does. Habits, tasks and goals are hidden, not erased,
// so their past stays in the timelines; an open goal removed this way counts
// as dropped. Everything else, and everything before 0008, is deleted.
export async function removeItem(
  supabase: SupabaseClient,
  category: ItemCategory,
  id: string,
  status?: GoalStatus
): Promise<void> {
  if (!HISTORY_CATEGORIES.has(category) || !(await historyEnabled(supabase))) {
    return deleteItem(supabase, id);
  }
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { archived_at: now };
  if (GOAL_CATEGORIES.has(category) && status !== "done") {
    patch.status = "dropped";
    patch.status_at = now;
  }
  const { error } = await supabase.from("items").update(patch).eq("id", id);
  if (error) throw error;
}

// Ticks or unticks a task, recording when it was completed.
export async function setTaskCompleted(
  supabase: SupabaseClient,
  id: string,
  completed: boolean
): Promise<void> {
  const patch: Record<string, unknown> = { completed };
  if (await historyEnabled(supabase)) {
    patch.completed_at = completed ? new Date().toISOString() : null;
  }
  const { error } = await supabase.from("items").update(patch).eq("id", id);
  if (error) throw error;
}

// Marks a goal achieved, or back to open.
export async function setGoalStatus(
  supabase: SupabaseClient,
  id: string,
  status: "open" | "done"
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ status, status_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// 7 Zonas
// ---------------------------------------------------------------------------

const ZONE_COUNT = 7;

// Returns the user's 7 zones in position order, creating any that are missing
// (first visit) pre-named with the FHS defaults. The migration seeds accounts
// that already existed; this covers every account created afterwards.
export async function fetchZones(supabase: SupabaseClient): Promise<Zone[]> {
  const { data, error } = await supabase
    .from("zones")
    .select("id, position, name")
    .order("position", { ascending: true });
  if (error) throw error;
  const zones = (data ?? []) as Zone[];
  if (zones.length >= ZONE_COUNT) return zones;

  const have = new Set(zones.map((z) => z.position));
  const missing = [];
  for (let p = 1; p <= ZONE_COUNT; p++) {
    if (!have.has(p)) missing.push({ position: p, name: defaultZoneName(p) });
  }
  // A second tab racing this insert hits the unique constraint; either way a
  // re-read returns the full set.
  await supabase.from("zones").insert(missing);
  const { data: again, error: err2 } = await supabase
    .from("zones")
    .select("id, position, name")
    .order("position", { ascending: true });
  if (err2) throw err2;
  return (again ?? []) as Zone[];
}

export async function renameZone(
  supabase: SupabaseClient,
  id: string,
  name: string
): Promise<void> {
  const { error } = await supabase.from("zones").update({ name }).eq("id", id);
  if (error) throw error;
}

// Every score the user has ever entered, newest month first. Small table.
export async function fetchZoneScores(
  supabase: SupabaseClient
): Promise<ZoneScore[]> {
  const { data, error } = await supabase
    .from("zone_scores")
    .select("zone_id, month, score")
    .order("month", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ZoneScore[];
}

// Upserts one zone's score for one month (month = YYYY-MM-01).
export async function setZoneScore(
  supabase: SupabaseClient,
  zoneId: string,
  month: string,
  score: number
): Promise<void> {
  const { error } = await supabase
    .from("zone_scores")
    .upsert({ zone_id: zoneId, month, score }, { onConflict: "zone_id,month" });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Vision de Vida (profiles.life_vision)
// ---------------------------------------------------------------------------

export async function fetchLifeVision(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "";
  const { data, error } = await supabase
    .from("profiles")
    .select("life_vision")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.life_vision ?? "";
}

export async function saveLifeVision(
  supabase: SupabaseClient,
  text: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("profiles")
    .update({ life_vision: text })
    .eq("id", user.id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Issue en Foco (profiles.spotlight_issue_id)
// ---------------------------------------------------------------------------

// The id of the person's spotlighted issue, or null when none is chosen.
export async function fetchSpotlightId(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("spotlight_issue_id")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.spotlight_issue_id ?? null;
}

// The spotlighted issue itself (for the Daily page), plus when it was chosen.
export async function fetchSpotlightIssue(
  supabase: SupabaseClient
): Promise<{ issue: TextItem | null; since: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { issue: null, since: null };
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("spotlight_issue_id, spotlight_since")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  const id = profile?.spotlight_issue_id as string | null | undefined;
  if (!id) return { issue: null, since: null };

  const { data: row, error: itemErr } = await supabase
    .from("items")
    .select("id, text, note")
    .eq("id", id)
    .maybeSingle();
  if (itemErr) throw itemErr;
  if (!row) return { issue: null, since: null };
  const issue: TextItem = { id: row.id, text: row.text };
  if (row.note) issue.note = row.note;
  return { issue, since: profile?.spotlight_since ?? null };
}

// Sets (or, with null, clears) the spotlighted issue.
export async function setSpotlight(
  supabase: SupabaseClient,
  issueId: string | null
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("profiles")
    .update({
      spotlight_issue_id: issueId,
      spotlight_since: issueId ? new Date().toISOString() : null,
    })
    .eq("id", user.id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Timelines (migration 0008)
// ---------------------------------------------------------------------------

// Records a habit's state for one local day: the window's progress as of that
// day, with the target that applied. Called on every tick or stepper change.
export async function logHabit(
  supabase: SupabaseClient,
  entry: HabitLog
): Promise<void> {
  const { error } = await supabase.from("habit_logs").upsert(
    { ...entry, updated_at: new Date().toISOString() },
    { onConflict: "user_id,habit_id,day" }
  );
  if (error) throw error;
}

// Habit log entries on or after `since` (YYYY-MM-DD), oldest first; all of
// the person's habits, or just one.
export async function fetchHabitLogs(
  supabase: SupabaseClient,
  since: string,
  habitId?: string
): Promise<HabitLog[]> {
  const rows = await selectAll<HabitLog>((from, to) => {
    let q = supabase
      .from("habit_logs")
      .select("habit_id, day, progress, target, completed")
      .gte("day", since);
    if (habitId) q = q.eq("habit_id", habitId);
    return q.order("day", { ascending: true }).order("habit_id").range(from, to);
  });
  return rows.map((r) => ({
    ...r,
    progress: Number(r.progress),
    target: r.target === null ? null : Number(r.target),
  }));
}

// The day recording began for this person (YYYY-MM-DD).
export async function fetchHistorySince(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return todayStr();
  const { data, error } = await supabase
    .from("profiles")
    .select("history_since")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.history_since ?? todayStr();
}

// Current (not removed) habits, for the monthly review.
export async function fetchActiveHabits(supabase: SupabaseClient): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_COLUMNS)
    .eq("category", "keystone_habits")
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as ItemRow[]).map(toHabit);
}

// When each task was completed, for tasks completed on or after `sinceIso`,
// including tasks removed since.
export async function fetchTaskCompletions(
  supabase: SupabaseClient,
  sinceIso: string
): Promise<string[]> {
  const rows = await selectAll<{ completed_at: string }>((from, to) =>
    supabase
      .from("items")
      .select("completed_at")
      .eq("category", "tasks")
      .gte("completed_at", sinceIso)
      .order("completed_at", { ascending: true })
      .range(from, to)
  );
  return rows.map((r) => r.completed_at);
}

// Open tasks created before `beforeIso` and still on the list.
export async function countStaleTasks(
  supabase: SupabaseClient,
  beforeIso: string
): Promise<number> {
  const { count, error } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("category", "tasks")
    .eq("completed", false)
    .is("archived_at", null)
    .lt("created_at", beforeIso);
  if (error) throw error;
  return count ?? 0;
}

// Goals at every level that were achieved or dropped since `sinceIso`, plus
// every goal still open.
export async function fetchGoalHistory(
  supabase: SupabaseClient,
  sinceIso: string
): Promise<GoalRow[]> {
  const cols = "id, text, category, status, status_at, archived_at";
  const categories = [...GOAL_CATEGORIES];
  const [resolved, open] = await Promise.all([
    selectAll<GoalRow>((from, to) =>
      supabase
        .from("items")
        .select(cols)
        .in("category", categories)
        .in("status", ["done", "dropped"])
        .gte("status_at", sinceIso)
        .order("status_at", { ascending: true })
        .range(from, to)
    ),
    selectAll<GoalRow>((from, to) =>
      supabase
        .from("items")
        .select(cols)
        .in("category", categories)
        .eq("status", "open")
        .is("archived_at", null)
        .order("created_at", { ascending: true })
        .range(from, to)
    ),
  ]);
  return [...resolved, ...open];
}
