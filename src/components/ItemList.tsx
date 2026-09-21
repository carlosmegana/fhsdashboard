"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteItem as dbDeleteItem,
  fetchItems,
  insertItem,
  setItemNote,
  updateItemText,
} from "@/lib/db";
import { classifyLoadError, type LoadFailure } from "@/lib/loadError";
import { createClient } from "@/lib/supabase/client";
import type { ItemCategory, TextItem } from "@/lib/types";
import { CATEGORY_PREFIXES } from "@/lib/types";
import AddItemButton from "./AddItemButton";
import ListItem from "./ListItem";
import LoadError from "./LoadError";

interface ItemListProps {
  category: ItemCategory;
  // Friction items belong to one week; pass that week's Monday to scope the
  // list and to stamp new items.
  weekStart?: string;
  emptyText?: string;
}

// One editable text list backed by a single `items` category. Same patterns as
// the Daily dashboard: optimistic local state, fire-and-forget persistence
// with a resync on failure, and lazy insert on the first non-empty save.
export default function ItemList({
  category,
  weekStart,
  emptyText = "Sin elementos. Agrega uno nuevo.",
}: ItemListProps) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<TextItem[] | null>(null);
  const [error, setError] = useState<LoadFailure | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reload = () => {
    setError(null);
    return fetchItems(supabase, category, weekStart)
      .then(setItems)
      .catch((err) => {
        console.error(`[${category}] load failed`, err);
        setError(classifyLoadError(err));
      });
  };

  useEffect(() => {
    let active = true;
    fetchItems(supabase, category, weekStart)
      .then((loaded) => {
        if (active) setItems(loaded);
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
  }, [supabase, category, weekStart]);

  const mutate = (fn: (list: TextItem[]) => TextItem[]) =>
    setItems((prev) => (prev ? fn(prev) : prev));

  const persist = (op: Promise<unknown>) => {
    op.catch((err) => {
      console.error(`[${category}] persist failed, resyncing`, err);
      reload();
    });
  };

  const addItem = () => {
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
    mutate((list) => list.filter((i) => i.id !== id));
    persist(dbDeleteItem(supabase, id));
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
            />
          ))}
        </ul>
      )}
      <AddItemButton onClick={addItem} />
    </>
  );
}
