"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchSpotlightIssue } from "@/lib/db";
import { classifyLoadError, type LoadFailure } from "@/lib/loadError";
import { createClient } from "@/lib/supabase/client";
import type { TextItem } from "@/lib/types";
import LoadError from "./LoadError";

interface Spotlight {
  issue: TextItem | null;
  since: string | null;
}

function sinceLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long" });
}

// Daily page: the one issue the person is actively working on. It is chosen
// (and retired) on the Monthly page; here it is only read, as a daily reminder.
export default function SpotlightIssue() {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<Spotlight | null>(null);
  const [error, setError] = useState<LoadFailure | null>(null);

  const load = () => {
    setError(null);
    return fetchSpotlightIssue(supabase)
      .then(setState)
      .catch((err) => {
        console.error("[spotlight] load failed", err);
        setError(classifyLoadError(err));
      });
  };

  useEffect(() => {
    let active = true;
    fetchSpotlightIssue(supabase)
      .then((s) => {
        if (active) setState(s);
      })
      .catch((err) => {
        if (!active) return;
        console.error("[spotlight] load failed", err);
        setError(classifyLoadError(err));
      });
    return () => {
      active = false;
    };
  }, [supabase]);

  if (error) return <LoadError kind={error} onRetry={load} />;

  if (!state) {
    return <div className="h-12 animate-pulse rounded-md bg-paper-2" aria-hidden="true" />;
  }

  if (!state.issue) {
    return (
      <p className="py-3 text-center text-sm text-ink-3">
        Ningun issue en foco. Elige uno en{" "}
        <Link href="/monthly" className="text-ink underline underline-offset-4">
          Monthly
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="py-1">
      <p className="text-[17px] font-medium leading-snug text-ink">{state.issue.text}</p>
      {state.issue.note && (
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-2">{state.issue.note}</p>
      )}
      <p className="mt-3 text-xs text-ink-3">
        {state.since ? `En foco desde el ${sinceLabel(state.since)} · ` : ""}
        <Link href="/monthly" className="text-ink-2 underline underline-offset-4 hover:text-ink">
          Cambiar en Monthly
        </Link>
      </p>
    </div>
  );
}
