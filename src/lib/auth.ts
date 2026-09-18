import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

// Server-side helpers for the signed-in user. Both read through the SSR client,
// so Row Level Security applies (a user can only read their own profile row).

export interface CurrentUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

// Returns the signed-in user with their admin flag, or null when signed out.
// A missing profiles row (or a DB without the is_admin column yet) reads as
// not-admin rather than failing the page.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    isAdmin: profile?.is_admin === true,
  };
}

// Gate for owner-only pages and server actions. Signed-out users go to /login;
// signed-in non-admins go back to the dashboard.
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");
  return user;
}
