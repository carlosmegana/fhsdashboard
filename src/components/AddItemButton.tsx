"use client";

interface AddItemButtonProps {
  onClick: () => void;
}

export default function AddItemButton({ onClick }: AddItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 rounded-full bg-orange-100/80 px-3 py-1 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-200/80 hover:text-orange-700"
    >
      + Agregar
    </button>
  );
}
