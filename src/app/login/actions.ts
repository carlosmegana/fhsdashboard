"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

// Invite-only signup. Public signups are disabled in Supabase, so the account is
// created via the Admin API (service role) only after a valid, unused invite code
// is confirmed. The code is then atomically claimed; on any failure the just-
// created user is rolled back so a code is never burned without an account.
export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("invite") ?? "").trim();

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
    .select("code, used_by")
    .eq("code", code)
    .maybeSingle();

  if (!invite || invite.used_by) {
    return { error: "Codigo de invitacion invalido o ya usado." };
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

  // 3. Atomically claim the code. The `used_by is null` guard makes this safe
  //    against a second signup racing for the same code.
  const { data: claimed } = await admin
    .from("invites")
    .update({ used_by: created.user.id, used_at: new Date().toISOString() })
    .eq("code", code)
    .is("used_by", null)
    .select("code");

  if (!claimed || claimed.length === 0) {
    // Lost the race (or code vanished) — roll back the user we just made.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Codigo de invitacion invalido o ya usado." };
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
