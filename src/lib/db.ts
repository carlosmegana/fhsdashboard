import type { SupabaseClient } from "@supabase/supabase-js";
import { periodStartStr, todayStr } from "./date";
import type {
  Categories,
  CategoryKey,
  Habit,
  HabitPeriod,
  ItemCategory,
  PgcData,
  TextItem,
  Zone,
  ZoneScore,
} from "./types";
import { DAILY_CATEGORIES } from "./types";

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
}

const ITEM_COLUMNS =
  "id, category, text, completed, note, created_at, target, unit, step, progress, period, period_start";

function emptyCategories(): Categories {
  return {
    keystone_habits: [],
    issues: [],
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
    const base = { id: row.id, text: row.text };
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

  const { data, error } = await supabase
    .from("items")
    .select(ITEM_COLUMNS)
    .in("category", DAILY_CATEGORIES)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as ItemRow[];
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

  const { data } = await supabase
    .from("items")
    .select("id, period, period_start, progress, completed")
    .eq("category", "keystone_habits");

  return applyDueResets(supabase, (data ?? []) as ResettableHabit[]);
}

// Plain text items for one category (the lists on the Weekly / Monthly /
// Quarterly pages). `weekStart` narrows to one week for friction items.
export async function fetchItems(
  supabase: SupabaseClient,
  category: ItemCategory,
  weekStart?: string
): Promise<TextItem[]> {
  let query = supabase
    .from("items")
    .select("id, text, note, created_at")
    .eq("category", category);
  if (weekStart) query = query.eq("week_start", weekStart);
  const { data, error } = await query
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const item: TextItem = { id: row.id, text: row.text };
    if (row.note) item.note = row.note;
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

// ---------------------------------------------------------------------------
// 7 Zonas
// ---------------------------------------------------------------------------

const ZONE_COUNT = 7;

// Returns the user's 7 zones in position order, creating any that are missing
// (first visit). Names start empty; the UI shows "Zona N" until renamed.
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
  for (let p = 1; p <= ZONE_COUNT; p++) if (!have.has(p)) missing.push({ position: p });
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
