"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { generateInviteCode } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteFormState = { error?: string; code?: string } | null;

const MAX_USES_LIMIT = 500;
const MAX_DAYS_LIMIT = 365;

// Creates an invite. Only admins get here (requireAdmin redirects everyone
// else). Multi-use codes let one link serve a whole cohort; an expiry keeps
// old links from living forever.
export async function createInvite(
  _prev: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  const user = await requireAdmin();

  const note = String(formData.get("note") ?? "").trim();
  const maxUses = Number(formData.get("maxUses") ?? 1);
  const expiresInDays = Number(formData.get("expiresInDays") ?? 0);

  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > MAX_USES_LIMIT) {
    return { error: `Uses must be a whole number between 1 and ${MAX_USES_LIMIT}.` };
  }
  if (
    !Number.isInteger(expiresInDays) ||
    expiresInDays < 0 ||
    expiresInDays > MAX_DAYS_LIMIT
  ) {
    return { error: `Expiry must be between 0 (never) and ${MAX_DAYS_LIMIT} days.` };
  }

  const expiresAt =
    expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
      : null;

  const admin = createAdminClient();

  // Retry on the (astronomically unlikely) code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateInviteCode();
    const { error } = await admin.from("invites").insert({
      code,
      note: note || null,
      max_uses: maxUses,
      expires_at: expiresAt,
      created_by: user.id,
    });
    if (!error) {
      revalidatePath("/admin");
      return { code };
    }
    if (error.code !== "23505") {
      console.error("[admin] createInvite failed", error);
      return { error: "Could not create the invite. Check the server logs." };
    }
  }
  return { error: "Could not generate a unique code. Try again." };
}

// Revoking keeps the row (and its redemption history) but stops further use.
export async function revokeInvite(formData: FormData): Promise<void> {
  await requireAdmin();
  const code = String(formData.get("code") ?? "");
  if (!code) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("code", code)
    .is("revoked_at", null);
  if (error) console.error("[admin] revokeInvite failed", error);

  revalidatePath("/admin");
}
