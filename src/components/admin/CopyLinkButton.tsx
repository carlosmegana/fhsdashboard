"use client";

import { useEffect, useState } from "react";
import { inviteLink } from "@/lib/invites";

// Copies the signup link for a code. The origin is read in the browser so the
// same build works on localhost, on Vercel previews and on the real domain.
export default function CopyLinkButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    const link = inviteLink(window.location.origin, code);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (http, permissions); fall back to a prompt so
      // the link is still reachable.
      window.prompt("Copy this link:", link);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-line px-2 py-1 text-xs text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
