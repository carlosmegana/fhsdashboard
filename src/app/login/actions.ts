"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { inviteStatus, normalizeInviteCode, type InviteRow } from "@/lib/invites";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | null;

// Server actions for email + password auth. Both return a friendly Spanish
// error string (no accents, matching app copy) on failure, or redirect to the
// dashboard on success.

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contrasena." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Correo o contrasena incorrectos." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

const INVALID_INVITE = "Codigo de invitacion invalido, vencido o ya usado.";

// Invite-only signup. Public signups are disabled in Supabase, so the account is
// created via the Admin API (service role) only after a valid invite code is
// confirmed. One use of the code is then claimed atomically (claim_invite);
// on any failure the just-created user is rolled back so a use is never burned
// without an account.
export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const code = normalizeInviteCode(String(formData.get("invite") ?? ""));

  if (!email || !password) {
    return { error: "Ingresa tu correo y contrasena." };
  }
  if (password.length < 6) {
    return { error: "La contrasena debe tener al menos 6 caracteres." };
  }
  if (!code) {
    return { error: "Ingresa tu codigo de invitacion." };
  }

  const admin = createAdminClient();

  // 1. Fast pre-check for a friendly error before creating anything.
  const { data: invite } = await admin
    .from("invites")
    .select("code, note, max_uses, use_count, expires_at, revoked_at, created_at")
    .eq("code", code)
    .maybeSingle<InviteRow>();

  if (!invite || inviteStatus(invite) !== "active") {
    return { error: INVALID_INVITE };
  }

  // 2. Create the confirmed user (Admin API bypasses the disabled-signup block).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !created?.user) {
    return { error: "No se pudo crear la cuenta. El correo podria ya existir." };
  }

  // 3. Atomically claim one use. The function re-checks every condition inside
  //    the UPDATE, so a second signup racing for the last use loses cleanly.
  const { data: claimed, error: claimErr } = await admin.rpc("claim_invite", {
    p_code: code,
    p_user_id: created.user.id,
    p_email: email,
  });

  if (claimErr || claimed !== true) {
    // Lost the race (or code vanished) — roll back the user we just made.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: INVALID_INVITE };
  }

  // 4. Establish a session (sets auth cookies via the SSR server client).
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInErr) {
    // Account exists but auto-login failed; let them sign in manually.
    redirect("/login");
  }

  revalidatePath("/", "layout");
  redirect("/");
}
