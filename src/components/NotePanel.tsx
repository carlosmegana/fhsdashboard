"use client";

import { useRef } from "react";

interface NotePanelProps {
  note: string;
  editing: boolean;
  onStartEdit: () => void;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export default function NotePanel({
  note,
  editing,
  onStartEdit,
  onSave,
  onCancel,
}: NotePanelProps) {
  const cancelledRef = useRef(false);

  if (editing) {
    // Uncontrolled: the textarea remounts on each edit session, so
    // defaultValue pre-fills it and the final value is read on blur.
    return (
      <textarea
        autoFocus
        defaultValue={note}
        rows={3}
        placeholder="Escribe una nota..."
        aria-label="Nota"
        onFocus={(e) => {
          cancelledRef.current = false;
          const v = e.currentTarget.value;
          e.currentTarget.setSelectionRange(v.length, v.length);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            cancelledRef.current = true;
            onCancel();
          } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.currentTarget.blur();
          }
        }}
        onBlur={(e) => {
          if (!cancelledRef.current) onSave(e.currentTarget.value);
        }}
        className="w-full resize-y rounded-md border border-note-line bg-note p-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-ink/40"
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onStartEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter") onStartEdit();
      }}
      className="cursor-text whitespace-pre-wrap rounded-md border border-note-line bg-note p-3 text-sm text-ink"
    >
      {note}
    </div>
  );
}
