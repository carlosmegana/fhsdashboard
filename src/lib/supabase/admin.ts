import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client. SERVER-ONLY: it holds a key that bypasses Row
// Level Security, so it must never be imported into client code. It is only used
// by the signup server action to validate invite codes and create users via the
// Admin API. `SUPABASE_SERVICE_ROLE_KEY` must NOT have the NEXT_PUBLIC_ prefix.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for invite-only signup."
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
