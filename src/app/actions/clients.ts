"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addClient(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string) || null;
  const tax_id = (formData.get("tax_id") as string) || null;
  const currency = (formData.get("currency") as string) || "USD";
  const address = (formData.get("address") as string) || null;
  const phone_number = (formData.get("phone_number") as string) || null;
  const business_phone = (formData.get("business_phone") as string) || null;
  const extension = (formData.get("extension") as string) || null;
  const note = (formData.get("note") as string) || null;

  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase.from("clients").insert({
    user_id: user.id,
    name: name.trim(),
    email: email?.trim() || null,
    tax_id: tax_id?.trim() || null,
    currency: currency?.trim() || "USD",
    status: "active",
    address: address?.trim() || null,
    phone_number: phone_number?.trim() || null,
    business_phone: business_phone?.trim() || null,
    extension: extension?.trim() || null,
    note: note?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { success: true };
}

export async function updateClient(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string) || null;
  const tax_id = (formData.get("tax_id") as string) || null;
  const currency = (formData.get("currency") as string) || "USD";
  const status = (formData.get("status") as "active" | "archived") || "active";
  const address = (formData.get("address") as string) || null;
  const phone_number = (formData.get("phone_number") as string) || null;
  const business_phone = (formData.get("business_phone") as string) || null;
  const extension = (formData.get("extension") as string) || null;
  const note = (formData.get("note") as string) || null;

  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase
    .from("clients")
    .update({
      name: name.trim(),
      email: email?.trim() || null,
      tax_id: tax_id?.trim() || null,
      currency: currency?.trim() || "USD",
      status,
      address: address?.trim() || null,
      phone_number: phone_number?.trim() || null,
      business_phone: business_phone?.trim() || null,
      extension: extension?.trim() || null,
      note: note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { success: true };
}

export async function deleteClient(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/clients");
  return { success: true };
}
