"use client";

import type { LoadFailure } from "@/lib/loadError";

// Shown in place of a card's contents when its data could not be loaded, so a
// broken section never masquerades as an empty one.
export default function LoadError({
  kind,
  onRetry,
}: {
  kind: LoadFailure;
  onRetry?: () => void;
}) {
  return (
    <div className="py-3 text-center" role="alert">
      <p className="text-sm text-ink-2">
        {kind === "missing_schema"
          ? "Esta seccion necesita una actualizacion de la base de datos."
          : "No se pudo cargar esta seccion."}
      </p>
      <p className="mt-1 text-xs text-ink-3">
        {kind === "missing_schema"
          ? "Aplica la migracion 0005_horizons.sql en Supabase y recarga."
          : "Revisa tu conexion e intenta de nuevo."}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
