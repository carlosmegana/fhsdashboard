"use client";

import type { ChecklistItem } from "@/lib/types";
import DeleteButton from "./DeleteButton";
import EditableText from "./EditableText";
import NoteButton from "./NoteButton";
import NotePanel from "./NotePanel";
import { useItemNote } from "./useItemNote";

interface TaskItemProps {
  item: ChecklistItem;
  isEditing: boolean;
  onToggle: (checked: boolean) => void;
  onStartEdit: () => void;
  onSave: (text: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  onSaveNote: (text: string) => void;
}

export default function TaskItem({
  item,
  isEditing,
  onToggle,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  onSaveNote,
}: TaskItemProps) {
  const noteState = useItemNote(item.note, onSaveNote);

  return (
    <li className="group">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={item.id}
          checked={item.completed}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 shrink-0 cursor-pointer accent-orange-500"
        />
        <label htmlFor={item.id} className="sr-only">
          {item.text || "Nuevo elemento"}
        </label>
        <div className="min-w-0 flex-1">
          <EditableText
            text={item.text}
            isEditing={isEditing}
            onStartEdit={onStartEdit}
            onSave={onSave}
            onCancel={onCancel}
            className={
              item.completed
                ? "text-base text-stone-400 line-through opacity-60"
                : "text-base text-stone-800"
            }
          />
        </div>
        <NoteButton
          hasNote={noteState.hasNote}
          open={noteState.open}
          onToggle={noteState.toggle}
        />
        <DeleteButton onDelete={onDelete} />
      </div>
      {noteState.open && (
        <div className="ml-6 mt-1.5">
          <NotePanel
            note={item.note ?? ""}
            editing={noteState.editing}
            onStartEdit={noteState.startEdit}
            onSave={noteState.save}
            onCancel={noteState.cancel}
          />
        </div>
      )}
    </li>
  );
}
