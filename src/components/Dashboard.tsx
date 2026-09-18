"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDisplayDate } from "@/lib/date";
import {
  deleteItem as dbDeleteItem,
  fetchDashboard,
  insertItem,
  runDailyResetIfNeeded,
  setHabitConfig,
  setItemCompleted,
  setItemNote,
  setItemProgress,
  updateItemText,
} from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import type { CategoryKey, HabitPeriod, PgcData } from "@/lib/types";
import { CATEGORY_PREFIXES } from "@/lib/types";
import AddItemButton from "./AddItemButton";
import DashboardCard from "./DashboardCard";
import type { HabitConfig } from "./HabitItem";
import HabitItem from "./HabitItem";
import ListItem from "./ListItem";
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
};

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
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchDashboard(supabase).then((loaded) => {
      // Data is only available after the async fetch, so the first real render
      // happens post-mount. This mirrors the previous hydration-safe pattern.
      if (active) setData(loaded);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

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

  const setCompleted = (key: CategoryKey, id: string, completed: boolean) => {
    mutate((d) =>
      updateCategory(d, key, (list) =>
        list.map((i) => (i.id === id ? { ...i, completed } : i))
      )
    );
    persist(setItemCompleted(supabase, id, completed));
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

  const deleteItem = (key: CategoryKey, id: string) => {
    mutate((d) =>
      updateCategory(d, key, (list) => list.filter((i) => i.id !== id))
    );
    persist(dbDeleteItem(supabase, id));
  };

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

      {!data ? (
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
            title="Habitos Clave"
            description="Rutinas que sostienen todo lo demas. Cada una se reinicia segun su ritmo: diario, semanal o mensual."
            className="md:order-1"
          >
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
            title="Metas"
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
                    {...itemHandlers("metas", item.id)}
                  />
                ))}
              </ul>
            )}
            <AddItemButton onClick={() => addItem("metas")} />
          </DashboardCard>

          <DashboardCard
            title="Problemas"
            description="Patrones y retos en los que estas trabajando."
            className="md:order-4"
          >
            {data.categories.issues.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="divide-y divide-line">
                {data.categories.issues.map((item) => (
                  <ListItem
                    key={item.id}
                    item={item}
                    {...itemHandlers("issues", item.id)}
                  />
                ))}
              </ul>
            )}
            <AddItemButton onClick={() => addItem("issues")} />
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
    </>
  );
}
