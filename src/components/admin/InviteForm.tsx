"use client";

import { useActionState } from "react";
import { createInvite, type InviteFormState } from "@/app/(app)/admin/actions";
import CopyLinkButton from "./CopyLinkButton";

const INPUT =
  "w-full rounded-md border border-line-2 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink";
const LABEL = "mb-1 block text-xs font-medium text-ink-2";

export default function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteFormState, FormData>(
    createInvite,
    null
  );

  return (
    <div>
      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor="note" className={LABEL}>
            Label (optional)
          </label>
          <input
            id="note"
            name="note"
            type="text"
            placeholder="FHS cohort · Sept 2026"
            className={INPUT}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="maxUses" className={LABEL}>
              Uses
            </label>
            <input
              id="maxUses"
              name="maxUses"
              type="number"
              min={1}
              max={500}
              defaultValue={1}
              required
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="expiresInDays" className={LABEL}>
              Expires in (days)
            </label>
            <input
              id="expiresInDays"
              name="expiresInDays"
              type="number"
              min={0}
              max={365}
              defaultValue={30}
              required
              className={INPUT}
            />
            <p className="mt-1 text-[11px] text-ink-3">0 = never</p>
          </div>
        </div>

        {state?.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "Creating..." : "Create invite"}
        </button>
      </form>

      {state?.code && (
        <div className="mt-4 rounded-md border border-line bg-paper-2 p-3">
          <p className="text-xs text-ink-3">New invite</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <code className="text-sm font-medium tracking-wide text-ink">
              {state.code}
            </code>
            <CopyLinkButton code={state.code} />
          </div>
        </div>
      )}
    </div>
  );
}
