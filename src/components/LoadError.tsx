"use client";

import type { LoadFailure } from "@/lib/loadError";

const MESSAGES: Record<"load" | "save", Record<LoadFailure, [string, string]>> = {
  load: {
    missing_schema: [
      "Esta seccion necesita una actualizacion de la base de datos.",
      "Aplica las migraciones pendientes en Supabase y recarga.",
    ],
    unknown: ["No se pudo cargar esta seccion.", "Revisa tu conexion e intenta de nuevo."],
  },
  save: {
    missing_schema: [
      "No se guardo: falta una actualizacion de la base de datos.",
      "Aplica las migraciones pendientes en Supabase y vuelve a intentarlo.",
    ],
    unknown: ["No se pudo guardar el cambio.", "Revisa tu conexion e intenta de nuevo."],
  },
};

// Shown when a card's data could not be loaded or a change could not be saved,
// so a broken section never masquerades as an empty one and a lost edit never
// disappears silently.
export default function LoadError({
  kind,
  action = "load",
  onRetry,
  onDismiss,
}: {
  kind: LoadFailure;
  action?: "load" | "save";
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const [title, hint] = MESSAGES[action][kind];
  return (
    <div className="py-3 text-center" role="alert">
      <p className="text-sm text-ink-2">{title}</p>
      <p className="mt-1 text-xs text-ink-3">{hint}</p>
      {(onRetry || onDismiss) && (
        <div className="mt-2 flex justify-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
            >
              Reintentar
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md px-2.5 py-1 text-xs text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
            >
              Cerrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
