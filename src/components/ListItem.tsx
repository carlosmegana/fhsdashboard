"use client";

import type { TextItem } from "@/lib/types";
import DeleteButton from "./DeleteButton";
import EditableText from "./EditableText";
import GoalCheckButton from "./GoalCheckButton";
import NoteButton from "./NoteButton";
import NotePanel from "./NotePanel";
import SpotlightButton from "./SpotlightButton";
import { useItemNote } from "./useItemNote";

interface ListItemProps {
  item: TextItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (text: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  onSaveNote: (text: string) => void;
  // Only on lists that support an Issue en Foco (the Issues list).
  spotlight?: { active: boolean; onToggle: () => void };
  // Only on goal lists: mark the goal achieved (lograda) or open again.
  goal?: { done: boolean; onToggle: () => void };
}

export default function ListItem({
  item,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  onSaveNote,
  spotlight,
  goal,
}: ListItemProps) {
  const noteState = useItemNote(item.note, onSaveNote);

  return (
    <li className="group py-1.5">
      <div className="flex items-center gap-2">
        {goal && (
          <GoalCheckButton done={goal.done} label={item.text} onToggle={goal.onToggle} />
        )}
        <div className="min-w-0 flex-1">
          <EditableText
            text={item.text}
            isEditing={isEditing}
            onStartEdit={onStartEdit}
            onSave={onSave}
            onCancel={onCancel}
            className={goal?.done ? "text-[15px] text-ink-3" : "text-[15px] text-ink"}
          />
        </div>
        {spotlight?.active && (
          <span className="shrink-0 rounded-full border border-ink px-2 py-0.5 text-[11px] font-medium text-ink">
            En foco
          </span>
        )}
        {spotlight && (
          <SpotlightButton active={spotlight.active} onToggle={spotlight.onToggle} />
        )}
        <NoteButton
          hasNote={noteState.hasNote}
          open={noteState.open}
          onToggle={noteState.toggle}
        />
        <DeleteButton onDelete={onDelete} />
      </div>
      {noteState.open && (
        <div className="mt-1.5">
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
