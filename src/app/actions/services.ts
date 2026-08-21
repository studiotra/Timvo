"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ServiceOpt = { id: string; name: string; default_rate?: number | null; billing_type?: string };

export async function getServicesForSelect(): Promise<ServiceOpt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("services")
    .select("id, name, default_rate, billing_type")
    .eq("user_id", user.id)
    .order("name");
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    default_rate: s.default_rate ?? null,
    billing_type: (s.billing_type ?? "hourly") as string,
  }));
}

export async function addService(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const billing_type = (formData.get("billing_type") as "hourly" | "fixed") || "hourly";
  const default_rate = formData.get("default_rate")
    ? parseFloat(formData.get("default_rate") as string)
    : null;

  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase.from("services").insert({
    user_id: user.id,
    name: name.trim(),
    default_rate,
    billing_type,
  });

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/services");
  revalidatePath("/org/services");
  return { success: true };
}

export async function updateService(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const billing_type = (formData.get("billing_type") as "hourly" | "fixed") || "hourly";
  const default_rate = formData.get("default_rate")
    ? parseFloat(formData.get("default_rate") as string)
    : null;

  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase
    .from("services")
    .update({ name: name.trim(), default_rate, billing_type })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/services");
  revalidatePath("/org/services");
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
  revalidatePath("/services");
  revalidatePath("/org/services");
  return { success: true };
}
