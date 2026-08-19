"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addProject(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const billing_type = (formData.get("billing_type") as "hourly" | "fixed") || "hourly";
  const status = (formData.get("status") as "active" | "archived") || "active";
  const description = (formData.get("description") as string)?.trim() || null;
  const retainerAmountRaw = (formData.get("retainer_amount") as string)?.trim();
  const retainerAmount = retainerAmountRaw ? parseFloat(retainerAmountRaw) : null;
  const retainerHoursRaw = (formData.get("retainer_hours") as string)?.trim();
  const retainerHours = retainerHoursRaw ? parseFloat(retainerHoursRaw) : null;
  const agreedFeeRaw = (formData.get("agreed_fee") as string)?.trim();
  const agreedFee = agreedFeeRaw ? parseFloat(agreedFeeRaw) : null;
  const estimatedHoursRaw = (formData.get("estimated_hours") as string)?.trim();
  const estimatedHours = estimatedHoursRaw ? parseFloat(estimatedHoursRaw) : null;
  const taxRateRaw = (formData.get("tax_rate") as string)?.trim();
  const taxRate = taxRateRaw ? parseFloat(taxRateRaw) : null;

  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase.from("projects").insert({
    client_id: clientId,
    name: name.trim(),
    hourly_rate: null,
    billing_type,
    status,
    description,
    retainer_amount: retainerAmount,
    retainer_hours: retainerHours,
    agreed_fee: agreedFee,
    estimated_hours: estimatedHours,
    tax_rate: taxRate,
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
  const billing_type = (formData.get("billing_type") as "hourly" | "fixed") || "hourly";
  const status = (formData.get("status") as "active" | "archived") || "active";
  const description = (formData.get("description") as string)?.trim() || null;
  const retainerAmountRaw = (formData.get("retainer_amount") as string)?.trim();
  const retainerAmount = retainerAmountRaw ? parseFloat(retainerAmountRaw) : null;
  const retainerHoursRaw = (formData.get("retainer_hours") as string)?.trim();
  const retainerHours = retainerHoursRaw ? parseFloat(retainerHoursRaw) : null;
  const agreedFeeRaw = (formData.get("agreed_fee") as string)?.trim();
  const agreedFee = agreedFeeRaw ? parseFloat(agreedFeeRaw) : null;
  const estimatedHoursRaw = (formData.get("estimated_hours") as string)?.trim();
  const estimatedHours = estimatedHoursRaw ? parseFloat(estimatedHoursRaw) : null;
  const taxRateRaw = (formData.get("tax_rate") as string)?.trim();
  const taxRate = taxRateRaw ? parseFloat(taxRateRaw) : null;

  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase
    .from("projects")
    .update({
      name: name.trim(),
      hourly_rate: null,
      billing_type,
      status,
      description,
      retainer_amount: retainerAmount,
      retainer_hours: retainerHours,
      agreed_fee: agreedFee,
      estimated_hours: estimatedHours,
      tax_rate: taxRate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("client_id", clientId);

  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/projects/${id}`);
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
  revalidatePath(`/clients/${clientId}/projects`);
  return { success: true };
}
