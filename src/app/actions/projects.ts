"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addProject(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const hourly_rate = formData.get("hourly_rate")
    ? parseFloat(formData.get("hourly_rate") as string)
    : null;
  const billing_type = (formData.get("billing_type") as "hourly" | "fixed") || "hourly";
  const status = (formData.get("status") as "active" | "archived") || "active";

  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase.from("projects").insert({
    client_id: clientId,
    name: name.trim(),
    hourly_rate,
    billing_type,
    status,
  });

  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function updateProject(
  id: string,
  clientId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const hourly_rate = formData.get("hourly_rate")
    ? parseFloat(formData.get("hourly_rate") as string)
    : null;
  const billing_type = (formData.get("billing_type") as "hourly" | "fixed") || "hourly";
  const status = (formData.get("status") as "active" | "archived") || "active";

  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase
    .from("projects")
    .update({
      name: name.trim(),
      hourly_rate,
      billing_type,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("client_id", clientId);

  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function deleteProject(id: string, clientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("client_id", clientId);

  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}
