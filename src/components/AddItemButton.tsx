"use client";

interface AddItemButtonProps {
  onClick: () => void;
}

export default function AddItemButton({ onClick }: AddItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 -ml-1 rounded-md px-1.5 py-1 text-sm text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
    >
      + Agregar
    </button>
  );
}
