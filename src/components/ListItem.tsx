"use client";

import type { TextItem } from "@/lib/types";
import DeleteButton from "./DeleteButton";
import EditableText from "./EditableText";
import NoteButton from "./NoteButton";
import NotePanel from "./NotePanel";
import { useItemNote } from "./useItemNote";

interface ListItemProps {
  item: TextItem;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (text: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  onSaveNote: (text: string) => void;
}

export default function ListItem({
  item,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  onSaveNote,
}: ListItemProps) {
  const noteState = useItemNote(item.note, onSaveNote);

  return (
    <li className="group">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <EditableText
            text={item.text}
            isEditing={isEditing}
            onStartEdit={onStartEdit}
            onSave={onSave}
            onCancel={onCancel}
            className="text-base text-stone-800"
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
