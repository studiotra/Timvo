"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addService(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const default_rate = formData.get("default_rate")
    ? parseFloat(formData.get("default_rate") as string)
    : null;

  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase.from("services").insert({
    user_id: user.id,
    name: name.trim(),
    default_rate,
  });

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function updateService(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const default_rate = formData.get("default_rate")
    ? parseFloat(formData.get("default_rate") as string)
    : null;

  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase
    .from("services")
    .update({ name: name.trim(), default_rate })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteService(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}
