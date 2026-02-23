import { createClient } from "@supabase/supabase-js";

/**
 * Admin client with service role key. Bypasses RLS.
 * Use only in trusted server contexts (e.g. webhooks) where no user session exists.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Required for webhooks.");
  }
  return createClient(url, key);
}
