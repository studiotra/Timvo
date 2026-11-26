"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatDateOnly } from "@/lib/dates";
import { syncRetainerSchedulesForUser } from "@/lib/invoices/sync-retainer-invoices";

export type RetainerInvoiceReminder = {
  id: string;
  clientId: string;
  clientName: string;
  occurrenceOn: string;
  occurrenceLabel: string;
  mode: "auto" | "reminder";
  periodLabel: string | null;
  detail: string | null;
  invoiceIds: string[];
};

function clientName(value: { name?: string } | { name?: string }[] | null): string {
  if (Array.isArray(value)) return value[0]?.name?.trim() || "Client";
  return value?.name?.trim() || "Client";
}

export async function syncAndListRetainerReminders(): Promise<RetainerInvoiceReminder[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const opened = await syncRetainerSchedulesForUser(supabase, user.id);
  if (opened > 0) {
    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath("/clients");
  }

  const { data } = await supabase
    .from("client_invoice_schedule_runs")
    .select("id, client_id, occurrence_on, mode, period_label, detail, invoice_ids, clients(name)")
    .eq("user_id", user.id)
    .eq("status", "open")
    .order("occurrence_on", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    clientName: clientName(row.clients as { name?: string } | { name?: string }[] | null),
    occurrenceOn: String(row.occurrence_on).slice(0, 10),
    occurrenceLabel: formatDateOnly(String(row.occurrence_on).slice(0, 10), { year: "numeric" }),
    mode: row.mode === "auto" ? "auto" : "reminder",
    periodLabel: row.period_label,
    detail: row.detail,
    invoiceIds: Array.isArray(row.invoice_ids) ? row.invoice_ids : [],
  }));
}

export async function dismissRetainerInvoiceReminder(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("client_invoice_schedule_runs")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "open");

  if (error) return { error: error.message };
  return { success: true };
}
