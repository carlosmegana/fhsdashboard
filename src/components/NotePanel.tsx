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
        className="w-full resize-y rounded-sm border border-amber-300 bg-amber-100 p-3 text-sm text-gray-800 shadow-sm outline-none placeholder:text-amber-700/50 focus:border-amber-400"
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
      className="-rotate-[0.4deg] cursor-text whitespace-pre-wrap rounded-sm border border-amber-200 bg-amber-100 p-3 text-sm text-gray-800 shadow-sm"
    >
      {note}
    </div>
  );
}
