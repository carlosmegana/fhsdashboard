"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchItems,
  fetchSpotlightId,
  historyEnabled,
  insertItem,
  removeItem,
  setGoalStatus,
  setItemNote,
  setSpotlight,
  updateItemText,
} from "@/lib/db";
import { classifyLoadError, type LoadFailure } from "@/lib/loadError";
import { createClient } from "@/lib/supabase/client";
import type { ItemCategory, TextItem } from "@/lib/types";
import { CATEGORY_PREFIXES, GOAL_CATEGORIES } from "@/lib/types";
import AddItemButton from "./AddItemButton";
import ListItem from "./ListItem";
import LoadError from "./LoadError";

interface ItemListProps {
  category: ItemCategory;
  // Friction items belong to one week; pass that week's Monday to scope the
  // list and to stamp new items.
  weekStart?: string;
  emptyText?: string;
  // Lets the person pick one item as their Issue en Foco (the Issues list).
  spotlight?: boolean;
}

// One editable text list backed by a single `items` category. Same patterns as
// the Daily dashboard: optimistic local state, fire-and-forget persistence
// with a resync on failure, and lazy insert on the first non-empty save.
export default function ItemList({
  category,
  weekStart,
  emptyText = "Sin elementos. Agrega uno nuevo.",
  spotlight = false,
}: ItemListProps) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<TextItem[] | null>(null);
  const [error, setError] = useState<LoadFailure | null>(null);
  const [saveError, setSaveError] = useState<LoadFailure | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  // Goal lists offer "lograda" once the history update (0008) is applied.
  const [goals, setGoals] = useState(false);

  // Items, plus the spotlight id when this list offers one. Both must load:
  // a missing spotlight column is a pending migration, reported like any other.
  const load = () =>
    Promise.all([
      fetchItems(supabase, category, weekStart),
      spotlight ? fetchSpotlightId(supabase) : Promise.resolve(null),
      historyEnabled(supabase),
    ]);

  const reload = () => {
    setError(null);
    return load()
      .then(([loaded, sid, history]) => {
        setItems(loaded);
        setSpotlightId(sid);
        setGoals(history && GOAL_CATEGORIES.has(category));
      })
      .catch((err) => {
        console.error(`[${category}] load failed`, err);
        setError(classifyLoadError(err));
      });
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchItems(supabase, category, weekStart),
      spotlight ? fetchSpotlightId(supabase) : Promise.resolve(null),
      historyEnabled(supabase),
    ])
      .then(([loaded, sid, history]) => {
        if (!active) return;
        setItems(loaded);
        setSpotlightId(sid);
        setGoals(history && GOAL_CATEGORIES.has(category));
      })
      .catch((err) => {
        // A failed read must surface: otherwise the skeleton below pulses
        // forever and looks exactly like an empty list.
        if (!active) return;
        console.error(`[${category}] load failed`, err);
        setError(classifyLoadError(err));
      });
    return () => {
      active = false;
    };
  }, [supabase, category, weekStart, spotlight]);

  const mutate = (fn: (list: TextItem[]) => TextItem[]) =>
    setItems((prev) => (prev ? fn(prev) : prev));

  // Fires a background write. On failure, say so (the optimistic change is
  // about to be rolled back by the resync, and the user must know why).
  const persist = (op: Promise<unknown>) => {
    op.catch((err) => {
      console.error(`[${category}] persist failed, resyncing`, err);
      setSaveError(classifyLoadError(err));
      reload();
    });
  };

  const addItem = () => {
    setSaveError(null);
    const id = `${CATEGORY_PREFIXES[category]}-${crypto.randomUUID()}`;
    mutate((list) => [...list, { id, text: "" }]);
    setEditingId(id);
  };

  const saveText = (id: string, raw: string) => {
    const text = raw.trim();
    // Decide insert-vs-update from committed state, not inside the updater.
    const current = items?.find((i) => i.id === id);
    const wasNew = !current || current.text === "";
    mutate((list) => {
      if (text === "") return wasNew ? list.filter((i) => i.id !== id) : list;
      return list.map((i) => (i.id === id ? { ...i, text } : i));
    });
    if (text !== "") {
      persist(
        wasNew
          ? insertItem(supabase, id, category, text, weekStart ? { week_start: weekStart } : {})
          : updateItemText(supabase, id, text)
      );
    }
    setEditingId(null);
  };

  const cancelEdit = (id: string) => {
    mutate((list) => {
      const item = list.find((i) => i.id === id);
      return item && item.text === "" ? list.filter((i) => i.id !== id) : list;
    });
    setEditingId(null);
  };

  const saveNote = (id: string, raw: string) => {
    const text = raw.trim();
    mutate((list) =>
      list.map((i) => (i.id === id ? { ...i, note: text === "" ? undefined : text } : i))
    );
    persist(setItemNote(supabase, id, text === "" ? null : text));
  };

  const deleteItem = (id: string) => {
    const status = items?.find((i) => i.id === id)?.status;
    mutate((list) => list.filter((i) => i.id !== id));
    // The database clears the spotlight itself (on delete set null).
    if (spotlightId === id) setSpotlightId(null);
    // Goals are hidden, not erased (an open one counts as dropped).
    persist(removeItem(supabase, category, id, status));
  };

  const toggleGoal = (id: string) => {
    const current = items?.find((i) => i.id === id);
    if (!current) return;
    const next = current.status === "done" ? "open" : "done";
    mutate((list) => list.map((i) => (i.id === id ? { ...i, status: next } : i)));
    persist(setGoalStatus(supabase, id, next));
  };

  // Clicking the spotlighted issue again takes it out of focus.
  const toggleSpotlight = (id: string) => {
    const next = spotlightId === id ? null : id;
    setSpotlightId(next);
    persist(setSpotlight(supabase, next));
  };

  if (error) return <LoadError kind={error} onRetry={reload} />;

  if (!items) {
    return <div className="h-16 animate-pulse rounded-md bg-paper-2" aria-hidden="true" />;
  }

  return (
    <>
      {items.length === 0 ? (
        <p className="py-3 text-center text-sm text-ink-3">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <ListItem
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              onStartEdit={() => setEditingId(item.id)}
              onSave={(text) => saveText(item.id, text)}
              onCancel={() => cancelEdit(item.id)}
              onDelete={() => deleteItem(item.id)}
              onSaveNote={(text) => saveNote(item.id, text)}
              goal={
                goals && item.text !== ""
                  ? { done: item.status === "done", onToggle: () => toggleGoal(item.id) }
                  : undefined
              }
              spotlight={
                // A brand-new, not-yet-saved item cannot be spotlighted.
                spotlight && item.text !== ""
                  ? {
                      active: spotlightId === item.id,
                      onToggle: () => toggleSpotlight(item.id),
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}
      {saveError && (
        <LoadError kind={saveError} action="save" onDismiss={() => setSaveError(null)} />
      )}
      <AddItemButton onClick={addItem} />
    </>
  );
}
