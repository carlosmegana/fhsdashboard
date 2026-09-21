// Classifies a failed Supabase read so the UI can tell "this database is
// missing a migration" apart from a genuine failure. Without this, a missing
// table and an empty list look identical (a card that never fills in).
//
// PGRST205 / PGRST202  table or function not in PostgREST's schema cache
// 42P01                undefined_table
// 42703                undefined_column
const MISSING_SCHEMA_CODES = new Set(["PGRST205", "PGRST202", "42P01", "42703"]);

export type LoadFailure = "missing_schema" | "unknown";

export function classifyLoadError(err: unknown): LoadFailure {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" && MISSING_SCHEMA_CODES.has(code)
    ? "missing_schema"
    : "unknown";
}
