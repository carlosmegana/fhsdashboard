export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  note?: string;
}

export interface TextItem {
  id: string;
  text: string;
  note?: string;
}

// Reset cadence for a keystone habit. The habit's progress carries within the
// window and zeroes out when a new window begins (see date.ts#periodStartStr).
export type HabitPeriod = "daily" | "weekly" | "monthly";

// A keystone habit. It behaves as a plain checkbox until it gets a `target`, at
// which point it becomes measurable (stepper + progress bar). `completed` stays
// authoritative for the "done today/this window" styling — for measurable habits
// it mirrors `progress > 0` (any progress counts as done).
export interface Habit {
  id: string;
  text: string;
  completed: boolean;
  note?: string;
  target?: number; // undefined = plain checkbox habit
  unit?: string;
  step: number; // +/- increment, >= 1
  progress: number; // logged amount in the current window
  period: HabitPeriod;
}

export interface Categories {
  keystone_habits: Habit[];
  valores: TextItem[];
  metas: TextItem[];
  tasks: ChecklistItem[];
}

export interface PgcData {
  lastActiveDate: string;
  categories: Categories;
}

// The five categories shown on the Daily page.
export type CategoryKey = keyof Categories;

// Every category stored in `items`, including the ones the other pages own:
//   friction         weekly, scoped by week_start
//   root_issues      THE Issues list (Monthly). One of them can be the
//                    spotlight, which is all the Daily page shows. The old
//                    Daily-only `issues` category was folded in by 0007.
//   quarter_goals    written quarterly, read monthly
//   year_goals       written yearly, read monthly
//   three_year_goals written yearly
//   beliefs          Creencias, shown on Weekly and Monthly (one shared list)
export type ItemCategory =
  | CategoryKey
  | "friction"
  | "root_issues"
  | "quarter_goals"
  | "year_goals"
  | "three_year_goals"
  | "beliefs";

export const DAILY_CATEGORIES: CategoryKey[] = [
  "keystone_habits",
  "valores",
  "metas",
  "tasks",
];

export const CATEGORY_PREFIXES: Record<ItemCategory, string> = {
  keystone_habits: "kh",
  valores: "vl",
  metas: "mt",
  tasks: "tk",
  friction: "fr",
  root_issues: "ri",
  quarter_goals: "qg",
  year_goals: "yg",
  three_year_goals: "tg",
  beliefs: "bl",
};

// The 7 zones of the Flow Habit System, in order. New accounts start with
// these names; a user can rename any of them on the Monthly page. Keep this
// list in sync with the seed block in 0005_horizons.sql.
export const DEFAULT_ZONE_NAMES = [
  "Salud",
  "Amor",
  "Crecimiento",
  "Trabajo",
  "Dinero",
  "Experiencias",
  "Trascendencia",
] as const;

// The default name for a 1-based zone position.
export function defaultZoneName(position: number): string {
  return DEFAULT_ZONE_NAMES[position - 1] ?? `Zona ${position}`;
}

// One of the user's 7 life zones, scored monthly.
export interface Zone {
  id: string;
  position: number; // 1..7
  name: string;
}

export interface ZoneScore {
  zone_id: string;
  month: string; // YYYY-MM-01
  score: number; // 1..10
}
