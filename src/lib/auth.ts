import { createClient } from "./supabase/server";

// Server-side helper for the signed-in user. Reads through the SSR client, so
// Row Level Security applies (a user can only read their own profile row).

export interface CurrentUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

// Returns the signed-in user, or null when signed out. `isAdmin` comes from
// profiles.is_admin (the first account ever created gets it automatically).
// Nothing in the UI uses it yet; it is here for future owner-only features.
// A missing profiles row reads as not-admin rather than failing the page.
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
