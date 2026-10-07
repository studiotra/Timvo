"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  friendlyDbError,
  parseEstimatedHours,
  parseHourlyRate,
  parseMoneyField,
  parseRetainerHours,
  parseTaxRatePercent,
} from "@/lib/projects/validation";

type ProjectFields = {
  name: string;
  billing_type: "hourly" | "fixed";
  status: "active" | "archived";
  description: string | null;
  hourly_rate: number | null;
  retainer_amount: number | null;
  retainer_hours: number | null;
  agreed_fee: number | null;
  estimated_hours: number | null;
  tax_rate: number | null;
};

function parseProjectFields(
  formData: FormData
): { data: ProjectFields } | { error: string } {
  const name = (formData.get("name") as string)?.trim() ?? "";
  const billing_type =
    ((formData.get("billing_type") as string) || "hourly") === "fixed"
      ? "fixed"
      : "hourly";
  const status =
    ((formData.get("status") as string) || "active") === "archived"
      ? "archived"
      : "active";
  const description = (formData.get("description") as string)?.trim() || null;

  if (!name) return { error: "Name is required" };

  const hourly = parseHourlyRate(formData.get("hourly_rate") as string);
  if (!hourly.ok) return { error: hourly.error };
  const retainerAmount = parseMoneyField(
    formData.get("retainer_amount") as string,
    "Retainer amount"
  );
  if (!retainerAmount.ok) return { error: retainerAmount.error };
  const retainerHours = parseRetainerHours(
    formData.get("retainer_hours") as string
  );
  if (!retainerHours.ok) return { error: retainerHours.error };
  const agreedFee = parseMoneyField(
    formData.get("agreed_fee") as string,
    "Agreed fee"
  );
  if (!agreedFee.ok) return { error: agreedFee.error };
  const estimatedHours = parseEstimatedHours(
    formData.get("estimated_hours") as string
  );
  if (!estimatedHours.ok) return { error: estimatedHours.error };
  const taxRate = parseTaxRatePercent(formData.get("tax_rate") as string);
  if (!taxRate.ok) return { error: taxRate.error };

  return {
    data: {
      name,
      billing_type,
      status,
      description,
      hourly_rate: billing_type === "hourly" ? hourly.value : null,
      retainer_amount: retainerAmount.value,
      retainer_hours: retainerHours.value,
      agreed_fee: agreedFee.value,
      estimated_hours: estimatedHours.value,
      tax_rate: taxRate.value,
    },
  };
}

export async function addProject(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = parseProjectFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase.from("projects").insert({
    client_id: clientId,
    ...parsed.data,
  });

  if (error) return { error: friendlyDbError(error.message) };
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

  const parsed = parseProjectFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await supabase
    .from("projects")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("client_id", clientId);

  if (error) return { error: friendlyDbError(error.message) };
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

  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/projects`);
  return { success: true };
}
