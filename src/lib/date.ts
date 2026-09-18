import type { HabitPeriod } from "./types";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// Local-time YYYY-MM-DD, matching the `date` columns in Postgres.
function localDateStr(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function todayStr(): string {
  return localDateStr(new Date());
}

// Start date (YYYY-MM-DD) of the reset window that contains `d`, per cadence:
//   daily   -> that day
//   weekly  -> the Monday of that week
//   monthly -> the 1st of that month
// A habit resets when this value moves past its stored `period_start`. Computed
// in local time to stay consistent with todayStr().
export function periodStartStr(period: HabitPeriod, d: Date = new Date()): string {
  if (period === "weekly") {
    const daysSinceMonday = (d.getDay() + 6) % 7; // getDay(): 0=Sun..6=Sat
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceMonday);
    return localDateStr(monday);
  }
  if (period === "monthly") {
    return localDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
  }
  return localDateStr(d);
}

export function formatDisplayDate(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]}, ${d.getFullYear()}`;
}
