import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client. Safe to call on every render — createBrowserClient
// memoizes a singleton internally. Reads the public (publishable) key, which is
// protected by Row Level Security.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
