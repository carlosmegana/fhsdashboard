"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { periodStartStr } from "@/lib/date";
import { fetchZoneScores, fetchZones, renameZone, setZoneScore } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import type { Zone, ZoneScore } from "@/lib/types";

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function zoneLabel(zone: Zone): string {
  return zone.name.trim() || `Zona ${zone.position}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es", { month: "long", year: "numeric" });
}

interface State {
  zones: Zone[];
  scores: ZoneScore[];
}

function useZones() {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<State | null>(null);

  const reload = () =>
    Promise.all([fetchZones(supabase), fetchZoneScores(supabase)]).then(
      ([zones, scores]) => setState({ zones, scores })
    );

  useEffect(() => {
    let active = true;
    Promise.all([fetchZones(supabase), fetchZoneScores(supabase)]).then(
      ([zones, scores]) => {
        if (active) setState({ zones, scores });
      }
    );
    return () => {
      active = false;
    };
  }, [supabase]);

  const persist = (op: Promise<unknown>) => {
    op.catch((err) => {
      console.error("[zones] persist failed, resyncing", err);
      reload();
    });
  };

  return { supabase, state, setState, persist };
}

// Monthly page: name the 7 zones (once) and score each 1-10 for this month.
export function ZonesScoreCard() {
  const { supabase, state, setState, persist } = useZones();
  const month = periodStartStr("monthly");

  if (!state) {
    return <div className="h-40 animate-pulse rounded-md bg-paper-2" aria-hidden="true" />;
  }

  const scoreFor = (zoneId: string) =>
    state.scores.find((s) => s.zone_id === zoneId && s.month === month)?.score;

  const setScore = (zoneId: string, score: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const rest = prev.scores.filter((s) => !(s.zone_id === zoneId && s.month === month));
      return { ...prev, scores: [{ zone_id: zoneId, month, score }, ...rest] };
    });
    persist(setZoneScore(supabase, zoneId, month, score));
  };

  const rename = (zoneId: string, raw: string) => {
    const name = raw.trim();
    setState((prev) =>
      prev
        ? { ...prev, zones: prev.zones.map((z) => (z.id === zoneId ? { ...z, name } : z)) }
        : prev
    );
    persist(renameZone(supabase, zoneId, name));
  };

  return (
    <div>
      <p className="mb-2 text-xs text-ink-3">{monthLabel(month)}</p>
      <ul className="divide-y divide-line">
        {state.zones.map((zone) => {
          const current = scoreFor(zone.id);
          return (
            <li key={zone.id} className="py-2">
              <input
                type="text"
                defaultValue={zone.name}
                placeholder={`Zona ${zone.position}`}
                aria-label={`Nombre de la zona ${zone.position}`}
                onBlur={(e) => {
                  if (e.currentTarget.value.trim() !== zone.name) rename(zone.id, e.currentTarget.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="w-full rounded-md border border-transparent px-1 py-0.5 text-[15px] text-ink outline-none placeholder:text-ink-3 hover:border-line focus:border-ink"
              />
              <div
                role="radiogroup"
                aria-label={`Puntaje de ${zoneLabel(zone)}`}
                className="mt-1 grid grid-cols-10 gap-1"
              >
                {SCORES.map((n) => {
                  const selected = current === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setScore(zone.id, n)}
                      className={`h-7 min-w-0 rounded-md border text-xs tabular-nums transition-colors ${
                        selected
                          ? "border-ink bg-ink text-paper"
                          : "border-line text-ink-2 hover:border-line-2 hover:text-ink"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Weekly page: the most recent month that has any score, read-only.
export function ZonesReadCard() {
  const { state } = useZones();

  if (!state) {
    return <div className="h-40 animate-pulse rounded-md bg-paper-2" aria-hidden="true" />;
  }

  const latestMonth = state.scores[0]?.month; // scores arrive newest first
  if (!latestMonth) {
    return (
      <p className="py-3 text-center text-sm text-ink-3">
        Sin puntaje todavia. Se escribe en{" "}
        <Link href="/monthly" className="text-ink underline underline-offset-4">
          Monthly
        </Link>
        .
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs text-ink-3">Ultimo puntaje · {monthLabel(latestMonth)}</p>
      <ul className="divide-y divide-line">
        {state.zones.map((zone) => {
          const score = state.scores.find(
            (s) => s.zone_id === zone.id && s.month === latestMonth
          )?.score;
          return (
            <li key={zone.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
                {zoneLabel(zone)}
              </span>
              <div
                className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-paper-2"
                aria-hidden="true"
              >
                {score !== undefined && (
                  <div className="h-full rounded-full bg-ink" style={{ width: `${score * 10}%` }} />
                )}
              </div>
              <span className="w-6 shrink-0 text-right text-sm tabular-nums text-ink-2">
                {score ?? "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
