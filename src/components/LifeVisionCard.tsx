"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchLifeVision, saveLifeVision } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";

// One free-text field, saved when the textarea loses focus.
export default function LifeVisionCard() {
  const supabase = useMemo(() => createClient(), []);
  const [text, setText] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    fetchLifeVision(supabase).then((t) => {
      if (active) setText(t);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [saved]);

  if (text === null) {
    return <div className="h-32 animate-pulse rounded-md bg-paper-2" aria-hidden="true" />;
  }

  const save = (value: string) => {
    if (value === text) return;
    setText(value);
    saveLifeVision(supabase, value)
      .then(() => setSaved(true))
      .catch((err) => {
        console.error("[life_vision] save failed", err);
        fetchLifeVision(supabase).then(setText);
      });
  };

  return (
    <div>
      <textarea
        defaultValue={text}
        rows={6}
        placeholder="Como quieres que sea tu vida. Escribelo en presente, como si ya fuera asi."
        aria-label="Vision de vida"
        onBlur={(e) => save(e.currentTarget.value)}
        className="w-full resize-y rounded-md border border-line bg-paper p-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-3 focus:border-ink"
      />
      <p className="mt-1 h-4 text-xs text-ink-3" aria-live="polite">
        {saved ? "Guardado" : ""}
      </p>
    </div>
  );
}
