"use client";

import { useState } from "react";

// Shared open/edit state for an item's post-it note. Opening an item
// without a note goes straight to edit mode; saving empty removes it.
export function useItemNote(
  note: string | undefined,
  onSaveNote: (text: string) => void
) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const hasNote = !!note;

  const toggle = () => {
    if (open) {
      setOpen(false);
      setEditing(false);
    } else {
      setOpen(true);
      setEditing(!hasNote);
    }
  };

  const startEdit = () => setEditing(true);

  const save = (raw: string) => {
    const text = raw.trim();
    onSaveNote(text);
    setEditing(false);
    if (text === "") setOpen(false);
  };

  const cancel = () => {
    setEditing(false);
    if (!hasNote) setOpen(false);
  };

  return { open, editing, hasNote, toggle, startEdit, save, cancel };
}
