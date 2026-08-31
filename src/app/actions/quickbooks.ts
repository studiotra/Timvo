"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { revokeToken } from "@/lib/quickbooks/oauth";

export async function disconnectQuickBooks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: conn } = await supabase
    .from("quickbooks_connections")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (conn?.refresh_token) {
    await revokeToken(conn.refresh_token);
  }

  const { error } = await supabase
    .from("quickbooks_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
