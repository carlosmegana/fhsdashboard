"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

// Open signup. Whether new accounts are allowed at all is controlled in the
// Supabase dashboard (Authentication -> "Allow new users to sign up"); when
// that switch is off, Supabase answers `signup_disabled` and we show a
// friendly message instead of a form error.
export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contrasena." };
  }
  if (password.length < 6) {
    return { error: "La contrasena debe tener al menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.code === "signup_disabled") {
      return { error: "El registro esta cerrado por ahora." };
    }
    if (error.code === "user_already_exists") {
      return { error: "Ya existe una cuenta con ese correo. Inicia sesion." };
    }
    return { error: "No se pudo crear la cuenta. Intenta de nuevo." };
  }

  // With "Confirm email" OFF in Supabase, signUp returns a session and the SSR
  // client has already written the auth cookies. If confirmation is ever
  // turned on, there is no session yet: tell the person to check their inbox.
  if (!data.session) {
    return { error: "Revisa tu correo para confirmar la cuenta." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
