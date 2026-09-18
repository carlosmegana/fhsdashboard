"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { Habit, HabitPeriod } from "@/lib/types";
import DeleteButton from "./DeleteButton";
import EditableText from "./EditableText";
import NoteButton from "./NoteButton";
import NotePanel from "./NotePanel";
import { useItemNote } from "./useItemNote";

export interface HabitConfig {
  target: number | null;
  unit: string | null;
  step: number;
  period: HabitPeriod;
}

interface HabitItemProps {
  item: Habit;
  isEditing: boolean;
  onToggle: (checked: boolean) => void;
  onAdjust: (delta: number) => void;
  onStartEdit: () => void;
  onSave: (text: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  onSaveNote: (text: string) => void;
  onSaveConfig: (config: HabitConfig) => void;
}

const PERIOD_LABEL: Record<HabitPeriod, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

export default function HabitItem({
  item,
  isEditing,
  onToggle,
  onAdjust,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  onSaveNote,
  onSaveConfig,
}: HabitItemProps) {
  const noteState = useItemNote(item.note, onSaveNote);
  const [configOpen, setConfigOpen] = useState(false);

  const measurable = item.target !== undefined && item.target > 0;
  const reached = measurable && item.progress >= (item.target as number);
  const done = measurable ? item.progress > 0 : item.completed;

  return (
    <li className="group py-1.5">
      <div className="flex items-center gap-2">
        {measurable ? (
          // Measurable habits track progress via the stepper below; a small
          // check marks the window's goal as reached.
          <span
            aria-hidden="true"
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-paper ${
              reached ? "bg-good" : "border border-line-2"
            }`}
          >
            {reached && (
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3 w-3"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </span>
        ) : (
          <input
            type="checkbox"
            id={item.id}
            checked={item.completed}
            onChange={(e) => onToggle(e.target.checked)}
            className="h-4 w-4 shrink-0 cursor-pointer accent-ink"
          />
        )}
        <label htmlFor={item.id} className="sr-only">
          {item.text || "Nuevo elemento"}
        </label>
        <div className={`min-w-0 flex-1 ${done ? "opacity-60" : ""}`}>
          <EditableText
            text={item.text}
            isEditing={isEditing}
            onStartEdit={onStartEdit}
            onSave={onSave}
            onCancel={onCancel}
            className="text-[15px] text-ink"
          />
        </div>
        {item.period !== "daily" && (
          <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-ink-3">
            {PERIOD_LABEL[item.period]}
          </span>
        )}
        <ConfigButton
          active={measurable}
          open={configOpen}
          onToggle={() => setConfigOpen((o) => !o)}
        />
        <NoteButton
          hasNote={noteState.hasNote}
          open={noteState.open}
          onToggle={noteState.toggle}
        />
        <DeleteButton onDelete={onDelete} />
      </div>

      {measurable && (
        <div className="ml-6 mt-1.5">
          <div className="flex items-center gap-2">
            <StepperButton
              label={`Restar ${item.step}`}
              disabled={item.progress <= 0}
              onClick={() => onAdjust(-item.step)}
            >
              −
            </StepperButton>
            <span className="min-w-0 text-sm tabular-nums text-ink-2">
              {item.progress} / {item.target}
              {item.unit ? ` ${item.unit}` : ""}
            </span>
            <StepperButton
              label={`Sumar ${item.step}`}
              onClick={() => onAdjust(item.step)}
            >
              +
            </StepperButton>
          </div>
          <div
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-2"
            role="progressbar"
            aria-valuenow={item.progress}
            aria-valuemin={0}
            aria-valuemax={item.target}
            aria-label={`Progreso: ${item.progress} de ${item.target}`}
          >
            <div
              className={`h-full rounded-full transition-[width] ${
                reached ? "bg-good" : "bg-ink"
              }`}
              style={{
                width: `${Math.min(100, (item.progress / (item.target as number)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {configOpen && (
        <div className="ml-6 mt-2">
          <HabitConfigPanel
            item={item}
            onSave={(config) => {
              onSaveConfig(config);
              setConfigOpen(false);
            }}
            onCancel={() => setConfigOpen(false)}
          />
        </div>
      )}

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

function StepperButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-2 text-lg leading-none text-ink-2 transition-colors hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function ConfigButton({
  active,
  open,
  onToggle,
}: {
  active: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={active ? "Editar meta" : "Agregar meta"}
      aria-expanded={open}
      onClick={onToggle}
      className={`shrink-0 p-1 transition-opacity ${
        active
          ? "text-ink hover:text-ink-2"
          : "text-ink-3 hover:text-ink md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    </button>
  );
}

// Config sub-form. Mounts fresh each time it opens (rendered only when open), so
// its controlled state initializes cleanly from the current item. Not a
// server-action form, so controlled inputs are safe here.
function HabitConfigPanel({
  item,
  onSave,
  onCancel,
}: {
  item: Habit;
  onSave: (config: HabitConfig) => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState(
    item.target !== undefined ? String(item.target) : ""
  );
  const [unit, setUnit] = useState(item.unit ?? "");
  const [step, setStep] = useState(String(item.step || 1));
  const [period, setPeriod] = useState<HabitPeriod>(item.period);

  const save = () => {
    const targetNum = target.trim() === "" ? NaN : Number(target);
    const stepNum = Number(step);
    onSave({
      target: Number.isFinite(targetNum) && targetNum > 0 ? targetNum : null,
      unit: unit.trim() === "" ? null : unit.trim(),
      step: Number.isFinite(stepNum) && stepNum >= 1 ? stepNum : 1,
      period,
    });
  };

  return (
    <div className="rounded-xl border border-line bg-paper-2 p-3">
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col text-xs font-semibold text-ink-2">
          Meta
          <input
            type="number"
            min={0}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="15"
            className="mt-0.5 w-20 rounded-md border border-line-2 bg-paper px-2 py-1 text-sm text-ink outline-none focus:border-ink"
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-ink-2">
          Unidad
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="min"
            className="mt-0.5 w-24 rounded-md border border-line-2 bg-paper px-2 py-1 text-sm text-ink outline-none focus:border-ink"
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-ink-2">
          Paso
          <input
            type="number"
            min={1}
            value={step}
            onChange={(e) => setStep(e.target.value)}
            placeholder="1"
            className="mt-0.5 w-16 rounded-md border border-line-2 bg-paper px-2 py-1 text-sm text-ink outline-none focus:border-ink"
          />
        </label>
      </div>

      <div className="mt-2 flex flex-col text-xs font-semibold text-ink-2">
        Se reinicia
        <div className="mt-0.5 inline-flex rounded-md border border-line-2 bg-paper p-0.5">
          {(Object.keys(PERIOD_LABEL) as HabitPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded px-2.5 py-1 text-sm transition-colors ${
                period === p
                  ? "bg-ink text-paper"
                  : "text-ink-2 hover:bg-paper-2"
              }`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-xs text-ink-3">
        Deja la meta vacia para volver a una casilla simple.
      </p>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded-md bg-ink px-3 py-1 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-sm font-medium text-ink-2 transition-colors hover:bg-paper-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
