import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveTimezone } from "@/lib/dates";

/** Load the user's Settings timezone (falls back via resolveTimezone). */
export async function fetchUserTimezone(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  return resolveTimezone(data?.timezone);
}
