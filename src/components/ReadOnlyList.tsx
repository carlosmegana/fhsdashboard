"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchItems } from "@/lib/db";
import { classifyLoadError, type LoadFailure } from "@/lib/loadError";
import { createClient } from "@/lib/supabase/client";
import type { ItemCategory, TextItem } from "@/lib/types";
import LoadError from "./LoadError";

interface ReadOnlyListProps {
  category: ItemCategory;
  // Where this list gets written, so an empty state can point there.
  editHref: string;
  editLabel: string;
}

// The "read zone" version of a list: shows what another page wrote, with no
// editing controls. Keeps the rule that nothing is written in two places.
export default function ReadOnlyList({ category, editHref, editLabel }: ReadOnlyListProps) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<TextItem[] | null>(null);
  const [error, setError] = useState<LoadFailure | null>(null);

  const load = () => {
    setError(null);
    return fetchItems(supabase, category)
      .then(setItems)
      .catch((err) => {
        console.error(`[${category}] load failed`, err);
        setError(classifyLoadError(err));
      });
  };

  useEffect(() => {
    let active = true;
    fetchItems(supabase, category)
      .then((loaded) => {
        if (active) setItems(loaded);
      })
      .catch((err) => {
        if (!active) return;
        console.error(`[${category}] load failed`, err);
        setError(classifyLoadError(err));
      });
    return () => {
      active = false;
    };
  }, [supabase, category]);

  if (error) return <LoadError kind={error} onRetry={load} />;

  if (!items) {
    return <div className="h-16 animate-pulse rounded-md bg-paper-2" aria-hidden="true" />;
  }

  if (items.length === 0) {
    return (
      <p className="py-3 text-center text-sm text-ink-3">
        Nada todavia. Se escribe en{" "}
        <Link href={editHref} className="text-ink underline underline-offset-4">
          {editLabel}
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="py-1.5">
          <p className={`flex items-start gap-2 text-[15px] ${item.status === "done" ? "text-ink-3" : "text-ink"}`}>
            {item.status === "done" && (
              <svg viewBox="0 0 16 16" className="mt-1 h-3.5 w-3.5 shrink-0" role="img" aria-label="Lograda">
                <circle cx="8" cy="8" r="8" fill="var(--color-ink)" />
                <path d="M4.6 8.2l2.2 2.2 4.6-4.8" fill="none" stroke="var(--color-paper)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span>{item.text}</span>
          </p>
          {item.note && (
            <p className="mt-0.5 whitespace-pre-wrap text-xs text-ink-3">{item.note}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
