"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function disconnectSlack() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("slack_connections").delete().eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}
