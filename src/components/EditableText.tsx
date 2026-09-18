"use client";

import { useRef } from "react";

interface EditableTextProps {
  text: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (text: string) => void;
  onCancel: () => void;
  className?: string;
}

export default function EditableText({
  text,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  className = "",
}: EditableTextProps) {
  const cancelledRef = useRef(false);

  if (isEditing) {
    // Uncontrolled: the input remounts on each edit session, so defaultValue
    // pre-fills it and the final value is read on blur.
    return (
      <input
        autoFocus
        type="text"
        defaultValue={text}
        onFocus={() => {
          cancelledRef.current = false;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            cancelledRef.current = true;
            onCancel();
          }
        }}
        onBlur={(e) => {
          if (!cancelledRef.current) onSave(e.currentTarget.value);
        }}
        className="w-full rounded-lg border border-orange-200 px-2 py-0.5 text-base text-stone-800 outline-none focus:border-orange-400"
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onStartEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter") onStartEdit();
      }}
      className={`block cursor-text ${className}`}
    >
      {text}
    </span>
  );
}
