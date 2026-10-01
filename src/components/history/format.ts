import type { HabitPeriod } from "@/lib/types";
import { parseDay } from "@/lib/history";

// Spanish date and cadence labels for the timelines (no accents, matching the
// rest of the app's copy).

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

export function shortDate(day: string): string {
  const d = parseDay(day);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function dayLabel(day: string): string {
  const d = parseDay(day);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function longDate(day: string): string {
  const d = parseDay(day);
  return `${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`;
}

export function monthShort(day: string): string {
  return MESES[parseDay(day).getMonth()];
}

export function monthLong(day: string): string {
  const d = parseDay(day);
  return `${MESES_LARGOS[d.getMonth()]} ${d.getFullYear()}`;
}

export const CADENCE_LABEL: Record<HabitPeriod, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

// Short unit for the streak button, and the spoken / long form.
export function streakUnit(period: HabitPeriod, n: number): { short: string; long: string } {
  if (period === "weekly") return { short: "sem", long: n === 1 ? "semana" : "semanas" };
  if (period === "monthly") return { short: "m", long: n === 1 ? "mes" : "meses" };
  return { short: "d", long: n === 1 ? "dia" : "dias" };
}

// "21 de 30 dias" style wording for a done/total pair.
export function rateLabel(period: HabitPeriod, done: number, total: number): string {
  if (total === 0) return "Sin datos todavia";
  const unit = streakUnit(period, total).long;
  return `${done} de ${total} ${unit}`;
}
