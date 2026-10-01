"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDisplayDate, todayStr } from "@/lib/date";
import {
  fetchDashboard,
  fetchHabitLogs,
  fetchHistorySince,
  historyEnabled,
  insertItem,
  logHabit,
  removeItem,
  runDailyResetIfNeeded,
  setGoalStatus,
  setHabitConfig,
  setItemCompleted,
  setItemNote,
  setItemProgress,
  setTaskCompleted,
  updateItemText,
} from "@/lib/db";
import { addDays, streak, type HabitLog } from "@/lib/history";
import { classifyLoadError, type LoadFailure } from "@/lib/loadError";
import { createClient } from "@/lib/supabase/client";
import type { CategoryKey, GoalStatus, HabitPeriod, PgcData } from "@/lib/types";
import { CATEGORY_PREFIXES } from "@/lib/types";
import AddItemButton from "./AddItemButton";
import DashboardCard from "./DashboardCard";
import type { HabitConfig } from "./HabitItem";
import HabitItem from "./HabitItem";
import HabitHistoryPanel from "./history/HabitHistoryPanel";
import ListItem from "./ListItem";
import LoadError from "./LoadError";
import SpotlightIssue from "./SpotlightIssue";
import TaskItem from "./TaskItem";

type AnyItem = {
  id: string;
  text: string;
  completed?: boolean;
  note?: string;
  // Habit-only fields, present on keystone_habits.
  target?: number;
  unit?: string;
  step?: number;
  progress?: number;
  period?: HabitPeriod;
  status?: GoalStatus; // Metas del Mes
};

// How far back the Daily page reads habit history to compute streaks.
const STREAK_LOOKBACK_DAYS = 120;

function updateCategory(
  data: PgcData,
  key: CategoryKey,
  fn: (list: AnyItem[]) => AnyItem[]
): PgcData {
  return {
    ...data,
    categories: {
      ...data.categories,
      [key]: fn(data.categories[key] as AnyItem[]),
    },
  };
}

function EmptyState() {
  return (
    <p className="py-3 text-center text-sm text-ink-3">
      Sin elementos. Agrega uno nuevo.
    </p>
  );
}

export default function Dashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<PgcData | null>(null);
  const [loadError, setLoadError] = useState<LoadFailure | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Timelines. `history` turns on once migration 0008 is applied; until then
  // the page behaves exactly as before. `logs` holds recent habit history for
  // the streaks, updated optimistically as habits are ticked.
  const [history, setHistory] = useState(false);
  const [historySince, setHistorySince] = useState<string | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [historyError, setHistoryError] = useState<LoadFailure | null>(null);
  const [historyHabitId, setHistoryHabitId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchDashboard(supabase)
      .then((loaded) => {
        // Data is only available after the async fetch, so the first real render
        // happens post-mount. This mirrors the previous hydration-safe pattern.
        if (active) setData(loaded);
      })
      .catch((err) => {
        // Never leave the skeleton pulsing: say what went wrong.
        if (!active) return;
        console.error("[dashboard] load failed", err);
        setLoadError(classifyLoadError(err));
      });
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    let active = true;
    historyEnabled(supabase)
      .then(async (enabled) => {
        if (!enabled) return;
        const [since, recent] = await Promise.all([
          fetchHistorySince(supabase),
          fetchHabitLogs(supabase, addDays(todayStr(), -STREAK_LOOKBACK_DAYS)),
        ]);
        if (!active) return;
        setHistorySince(since);
        setLogs(recent);
        setHistory(true);
      })
      .catch((err) => {
        if (!active) return;
        console.error("[dashboard] history load failed", err);
        setHistoryError(classifyLoadError(err));
      });
    return () => {
      active = false;
    };
  }, [supabase]);

  const retryLoad = () => {
    setLoadError(null);
    fetchDashboard(supabase)
      .then(setData)
      .catch((err) => setLoadError(classifyLoadError(err)));
  };

  // Cover the "tab left open past midnight" case: on refocus, re-check the daily
  // reset and reload if habits were reset server-side.
  useEffect(() => {
    const onFocus = () => {
      runDailyResetIfNeeded(supabase).then((didReset) => {
        if (didReset) fetchDashboard(supabase).then(setData);
      });
    };
    window.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [supabase]);

  // Optimistic local update. The presentational tree updates immediately; the
  // corresponding DB write is fired separately via persist().
  const mutate = (updater: (d: PgcData) => PgcData) => {
    setData((prev) => (prev ? updater(prev) : prev));
  };

  // Fires a background DB write. On failure, log and re-fetch to resync state.
  const persist = (op: Promise<unknown>) => {
    op.catch((err) => {
      console.error("[dashboard] persist failed, resyncing", err);
      fetchDashboard(supabase).then(setData);
    });
  };

  // Writes today's entry in the habit's history (the window's progress as of
  // today, with the target in force). A failure here never touches the habit
  // itself, but it is shown so a gap in the history is not silent.
  const recordHabit = (
    habitId: string,
    target: number | undefined,
    progress: number,
    completed: boolean
  ) => {
    if (!history) return;
    const entry: HabitLog = {
      habit_id: habitId,
      day: todayStr(),
      progress,
      target: target ?? null,
      completed,
    };
    setLogs((prev) => [
      ...prev.filter((l) => !(l.habit_id === habitId && l.day === entry.day)),
      entry,
    ]);
    logHabit(supabase, entry).catch((err) => {
      console.error("[dashboard] habit history write failed", err);
      setHistoryError(classifyLoadError(err));
    });
  };

  const setCompleted = (key: CategoryKey, id: string, completed: boolean) => {
    mutate((d) =>
      updateCategory(d, key, (list) =>
        list.map((i) => (i.id === id ? { ...i, completed } : i))
      )
    );
    if (key === "tasks") {
      persist(setTaskCompleted(supabase, id, completed));
      return;
    }
    persist(setItemCompleted(supabase, id, completed));
    if (key === "keystone_habits") {
      const habit = data?.categories.keystone_habits.find((h) => h.id === id);
      recordHabit(id, habit?.target, habit?.progress ?? 0, completed);
    }
  };

  // Metas del Mes: achieved, or back to open.
  const toggleGoal = (id: string) => {
    const goal = data?.categories.metas.find((g) => g.id === id);
    if (!goal) return;
    const next = goal.status === "done" ? "open" : "done";
    mutate((d) =>
      updateCategory(d, "metas", (list) =>
        list.map((i) => (i.id === id ? { ...i, status: next } : i))
      )
    );
    persist(setGoalStatus(supabase, id, next));
  };

  // Measurable-habit progress. Clamps at 0 (no upper cap — overshooting a target
  // is fine). "Done" mirrors any-progress-counts, matching setItemProgress.
  const adjustProgress = (id: string, delta: number) => {
    const habit = data?.categories.keystone_habits.find((h) => h.id === id);
    if (!habit) return;
    const next = Math.max(0, habit.progress + delta);
    mutate((d) =>
      updateCategory(d, "keystone_habits", (list) =>
        list.map((i) =>
          i.id === id ? { ...i, progress: next, completed: next > 0 } : i
        )
      )
    );
    persist(setItemProgress(supabase, id, next));
    recordHabit(id, habit.target, next, next > 0);
  };

  // Applies target/unit/step/cadence config. target=null reverts to a checkbox.
  const saveHabitConfig = (id: string, config: HabitConfig) => {
    mutate((d) =>
      updateCategory(d, "keystone_habits", (list) =>
        list.map((i) =>
          i.id === id
            ? {
                ...i,
                target: config.target ?? undefined,
                unit: config.unit ?? undefined,
                step: config.step,
                period: config.period,
              }
            : i
        )
      )
    );
    persist(setHabitConfig(supabase, id, config));
  };

  const addItem = (key: CategoryKey) => {
    const id = `${CATEGORY_PREFIXES[key]}-${crypto.randomUUID()}`;
    // Not persisted yet — a brand-new item lives only in local state until its
    // first non-empty text save (see saveText). Keystone habits start as a plain
    // daily checkbox (no target), mirroring the DB column defaults.
    const newItem: AnyItem =
      key === "keystone_habits"
        ? { id, text: "", completed: false, step: 1, progress: 0, period: "daily" }
        : key === "tasks"
          ? { id, text: "", completed: false }
          : { id, text: "" };
    mutate((d) => updateCategory(d, key, (list) => [...list, newItem]));
    setEditingId(id);
  };

  const saveText = (key: CategoryKey, id: string, raw: string) => {
    const text = raw.trim();
    // Read wasNew from the current committed state, NOT from inside the mutate
    // updater — state updaters run asynchronously, so a flag set in there is not
    // yet available when we choose insert vs update below. A brand-new item still
    // has empty text; a persisted item already has text.
    const current = data?.categories[key].find((i) => i.id === id) as
      | AnyItem
      | undefined;
    const wasNew = !current || current.text === "";
    mutate((d) =>
      updateCategory(d, key, (list) => {
        const item = list.find((i) => i.id === id);
        if (!item) return list;
        if (text === "") {
          // Empty save on a brand-new item removes it; on an existing item it reverts.
          return wasNew ? list.filter((i) => i.id !== id) : list;
        }
        return list.map((i) => (i.id === id ? { ...i, text } : i));
      })
    );
    if (text !== "") {
      persist(
        wasNew
          ? insertItem(supabase, id, key, text)
          : updateItemText(supabase, id, text)
      );
    }
    setEditingId(null);
  };

  const cancelEdit = (key: CategoryKey, id: string) => {
    // A cancelled brand-new item was never persisted, so only local state changes.
    mutate((d) =>
      updateCategory(d, key, (list) => {
        const item = list.find((i) => i.id === id);
        return item && item.text === ""
          ? list.filter((i) => i.id !== id)
          : list;
      })
    );
    setEditingId(null);
  };

  const saveNote = (key: CategoryKey, id: string, raw: string) => {
    const text = raw.trim();
    mutate((d) =>
      updateCategory(d, key, (list) =>
        // An empty note is dropped entirely (matches the nullable DB column).
        list.map((i) =>
          i.id === id ? { ...i, note: text === "" ? undefined : text } : i
        )
      )
    );
    persist(setItemNote(supabase, id, text === "" ? null : text));
  };

  // Habits, tasks and goals are hidden rather than erased once history is
  // recorded, so their past stays in the timelines.
  const deleteItem = (key: CategoryKey, id: string) => {
    const current = data?.categories[key].find((i) => i.id === id) as
      | AnyItem
      | undefined;
    mutate((d) =>
      updateCategory(d, key, (list) => list.filter((i) => i.id !== id))
    );
    if (historyHabitId === id) setHistoryHabitId(null);
    persist(removeItem(supabase, key, id, current?.status));
  };

  const today = todayStr();
  const streakFor = (habit: PgcData["categories"]["keystone_habits"][number]) => {
    if (!history || !historySince) return 0;
    const since =
      habit.createdOn && habit.createdOn > historySince ? habit.createdOn : historySince;
    return streak(
      logs.filter((l) => l.habit_id === habit.id),
      habit.period,
      today,
      since
    );
  };
  const historyHabit =
    data?.categories.keystone_habits.find((h) => h.id === historyHabitId) ?? null;

  const itemHandlers = (key: CategoryKey, id: string) => ({
    isEditing: editingId === id,
    onStartEdit: () => setEditingId(id),
    onSave: (text: string) => saveText(key, id, text),
    onCancel: () => cancelEdit(key, id),
    onDelete: () => deleteItem(key, id),
    onSaveNote: (text: string) => saveNote(key, id, text),
  });

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Daily</h1>
          <p className="mt-0.5 text-sm text-ink-3">Lo que revisas cada dia.</p>
        </div>
        {data && (
          <p className="text-sm tabular-nums text-ink-2">
            {formatDisplayDate(new Date())}
          </p>
        )}
      </div>

      {loadError ? (
        <div className="rounded-lg border border-line">
          <LoadError kind={loadError} onRetry={retryLoad} />
        </div>
      ) : !data ? (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
          aria-hidden="true"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg border border-line bg-paper-2"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <DashboardCard
            title="Keystone Habits"
            description="Rutinas que sostienen todo lo demas. Cada una se reinicia segun su ritmo: diario, semanal o mensual."
            className="md:order-1"
          >
            {historyError && (
              <p role="alert" className="mb-2 rounded-md bg-paper-2 px-3 py-2 text-xs text-ink-2">
                El historial de habitos no se esta guardando.{" "}
                {historyError === "missing_schema"
                  ? "Falta una actualizacion de la base de datos."
                  : "Revisa tu conexion y recarga."}
              </p>
            )}
            {data.categories.keystone_habits.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y divide-line">
                {data.categories.keystone_habits.map((item) => (
                  <HabitItem
                    key={item.id}
                    item={item}
                    onToggle={(checked) =>
                      setCompleted("keystone_habits", item.id, checked)
                    }
                    onAdjust={(delta) => adjustProgress(item.id, delta)}
                    onSaveConfig={(config) =>
                      saveHabitConfig(item.id, config)
                    }
                    streak={streakFor(item)}
                    onOpenHistory={
                      history && item.text !== ""
                        ? () => setHistoryHabitId(item.id)
                        : undefined
                    }
                    {...itemHandlers("keystone_habits", item.id)}
                  />
                ))}
              </ul>
            )}
            <AddItemButton onClick={() => addItem("keystone_habits")} />
          </DashboardCard>

          <DashboardCard
            title="Valores"
            description="Los principios que guian tus decisiones."
            className="md:order-2"
          >
            {data.categories.valores.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y divide-line">
                {data.categories.valores.map((item) => (
                  <ListItem
                    key={item.id}
                    item={item}
                    {...itemHandlers("valores", item.id)}
                  />
                ))}
              </ul>
            )}
            <AddItemButton onClick={() => addItem("valores")} />
          </DashboardCard>

          <DashboardCard
            title="Metas del Mes"
            description="Objetivos a mediano y largo plazo."
            className="md:order-5"
          >
            {data.categories.metas.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y divide-line">
                {data.categories.metas.map((item) => (
                  <ListItem
                    key={item.id}
                    item={item}
                    goal={
                      history && item.text !== ""
                        ? { done: item.status === "done", onToggle: () => toggleGoal(item.id) }
                        : undefined
                    }
                    {...itemHandlers("metas", item.id)}
                  />
                ))}
              </ul>
            )}
            <AddItemButton onClick={() => addItem("metas")} />
          </DashboardCard>

          <DashboardCard
            title="Issue en Foco"
            description="El issue en el que estas trabajando ahora."
            className="md:order-4"
          >
            <SpotlightIssue />
          </DashboardCard>

          <DashboardCard
            title="Tareas"
            description="Pendientes concretos. Se mantienen hasta que los completes."
            className="md:order-3 md:row-span-2"
            fillHeight
          >
            {data.categories.tasks.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y divide-line">
                {data.categories.tasks.map((item) => (
                  <TaskItem
                    key={item.id}
                    item={item}
                    onToggle={(checked) =>
                      setCompleted("tasks", item.id, checked)
                    }
                    {...itemHandlers("tasks", item.id)}
                  />
                ))}
              </ul>
            )}
            <AddItemButton onClick={() => addItem("tasks")} />
          </DashboardCard>
        </div>
      )}
      <HabitHistoryPanel
        habit={historyHabit}
        onClose={() => setHistoryHabitId(null)}
        localLogs={logs}
      />
    </>
  );
}
