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
  issues: TextItem[];
  valores: TextItem[];
  metas: TextItem[];
  tasks: ChecklistItem[];
}

export interface PgcData {
  lastActiveDate: string;
  categories: Categories;
}

export type CategoryKey = keyof Categories;

export const CATEGORY_PREFIXES: Record<CategoryKey, string> = {
  keystone_habits: "kh",
  issues: "is",
  valores: "vl",
  metas: "mt",
  tasks: "tk",
};
