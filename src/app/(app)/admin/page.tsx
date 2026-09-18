import CopyLinkButton from "@/components/admin/CopyLinkButton";
import InviteForm from "@/components/admin/InviteForm";
import PageHeader from "@/components/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { inviteStatus, type InviteRow, type InviteStatus } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { revokeInvite } from "./actions";

interface RedemptionRow {
  code: string;
  email: string | null;
  redeemed_at: string;
}

const STATUS_LABEL: Record<InviteStatus, string> = {
  active: "Active",
  used_up: "Used up",
  expired: "Expired",
  revoked: "Revoked",
};

const STATUS_CLASS: Record<InviteStatus, string> = {
  active: "text-good",
  used_up: "text-ink-3",
  expired: "text-ink-3",
  revoked: "text-ink-3 line-through",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Owner-only page: create invite links, see who has used them, revoke them.
// Reads go through the service-role client because the invites tables have no
// RLS policies (they are locked to server-side use).
export default async function AdminPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: inviteRows }, { data: redemptionRows }] = await Promise.all([
    admin
      .from("invites")
      .select("code, note, max_uses, use_count, expires_at, revoked_at, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("invite_redemptions")
      .select("code, email, redeemed_at")
      .order("redeemed_at", { ascending: false })
      .limit(20),
  ]);

  const invites = (inviteRows ?? []) as InviteRow[];
  const redemptions = (redemptionRows ?? []) as RedemptionRow[];

  return (
    <>
      <PageHeader
        title="Admin"
        subtitle="Invite links for the community and your coaching clients."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="rounded-lg border border-line p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            New invite
          </h2>
          <p className="mb-4 mt-0.5 text-xs text-ink-3">
            One link can serve a whole group. Set uses to 1 for a personal invite.
          </p>
          <InviteForm />
        </section>

        <section className="rounded-lg border border-line p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
            Invites
          </h2>
          {invites.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-3">
              No invites yet. Create one on the left.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {invites.map((invite) => {
                const status = inviteStatus(invite);
                return (
                  <li key={invite.code} className="py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <code className="text-sm font-medium tracking-wide text-ink">
                        {invite.code}
                      </code>
                      <span className={`text-xs ${STATUS_CLASS[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                      <span className="text-xs tabular-nums text-ink-3">
                        {invite.use_count} / {invite.max_uses} used
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        {status === "active" && (
                          <CopyLinkButton code={invite.code} />
                        )}
                        {status === "active" && (
                          <form action={revokeInvite}>
                            <input type="hidden" name="code" value={invite.code} />
                            <button
                              type="submit"
                              className="rounded-md px-2 py-1 text-xs text-ink-3 transition-colors hover:bg-paper-2 hover:text-danger"
                            >
                              Revoke
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {invite.note ? `${invite.note} · ` : ""}
                      created {formatDate(invite.created_at)}
                      {invite.expires_at
                        ? ` · expires ${formatDate(invite.expires_at)}`
                        : " · never expires"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-line p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
          Recent signups
        </h2>
        {redemptions.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-3">
            Nobody has signed up through an invite yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {redemptions.map((r, i) => (
              <li
                key={`${r.code}-${r.redeemed_at}-${i}`}
                className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm"
              >
                <span className="text-ink">{r.email ?? "(no email)"}</span>
                <code className="text-xs text-ink-3">{r.code}</code>
                <span className="ml-auto text-xs tabular-nums text-ink-3">
                  {formatDate(r.redeemed_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
