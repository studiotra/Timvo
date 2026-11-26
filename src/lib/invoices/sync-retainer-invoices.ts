import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysToDateString, resolveTimezone } from "@/lib/dates";
import { allocateInvoiceNumber } from "@/lib/invoices/allocate-number";
import { computeInvoiceMoney, resolveTaxRate } from "@/lib/invoices/money";
import {
  dueRetainerOccurrences,
  isInvoiceCadence,
  normalizeScheduleTime,
  type InvoiceScheduleMode,
} from "@/lib/invoices/retainer-schedule";

type ScheduledClient = {
  id: string;
  name: string;
  currency: string | null;
  status: string | null;
  invoice_cadence: string | null;
  invoice_anchor_date: string | null;
  invoice_time: string | null;
  invoice_schedule_mode: string | null;
  invoice_reminder_days: number | null;
  invoice_schedule_updated_at: string | null;
};

function dateOnly(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : null;
}

async function createRetainerDraft(
  supabase: SupabaseClient,
  input: {
    userId: string;
    clientId: string;
    projectId: string;
    projectName: string;
    currency: string;
    amount: number;
    taxRate: number | null;
    issuedOn: string;
    dueOn: string;
    periodLabel: string;
    footer: string | null;
    terms: string | null;
  }
): Promise<{ id: string } | { error: string }> {
  const money = computeInvoiceMoney(
    [{ quantity: 1, unit_rate: input.amount, amount: input.amount }],
    input.taxRate
  );
  const invoiceNumber = await allocateInvoiceNumber(supabase, input.userId);
  const insertRow: Record<string, unknown> = {
    client_id: input.clientId,
    project_id: input.projectId,
    user_id: input.userId,
    status: "draft",
    total_amount: money.total,
    currency: input.currency,
    issued_at: input.issuedOn,
    due_at: input.dueOn,
    footer: input.footer,
    terms_and_conditions: input.terms,
    is_locked: false,
  };
  if (invoiceNumber != null) insertRow.invoice_number = invoiceNumber;

  let created = await supabase.from("invoices").insert(insertRow).select("id").single();
  if (created.error && (invoiceNumber != null || "is_locked" in insertRow)) {
    delete insertRow.invoice_number;
    delete insertRow.is_locked;
    created = await supabase.from("invoices").insert(insertRow).select("id").single();
  }
  if (created.error || !created.data) return { error: created.error?.message ?? "Could not create invoice" };

  const { error: itemError } = await supabase.from("invoice_items").insert({
    invoice_id: created.data.id,
    description: `${input.projectName} retainer · ${input.periodLabel}`,
    quantity: 1,
    unit_rate: input.amount,
    amount: input.amount,
    sort_order: 0,
  });
  if (itemError) {
    await supabase.from("invoices").delete().eq("id", created.data.id).eq("user_id", input.userId);
    return { error: itemError.message };
  }
  return { id: created.data.id };
}

export async function syncRetainerSchedulesForUser(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<number> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, default_due_days, tax_rate, default_invoice_footer, default_invoice_terms")
    .eq("id", userId)
    .maybeSingle();
  const timezone = resolveTimezone(profile?.timezone);
  const dueDays = profile?.default_due_days ?? 30;

  const { data: clients, error } = await supabase
    .from("clients")
    .select(
      "id, name, currency, status, invoice_cadence, invoice_anchor_date, invoice_time, invoice_schedule_mode, invoice_reminder_days, invoice_schedule_updated_at"
    )
    .eq("user_id", userId)
    .eq("invoice_schedule_enabled", true);

  if (error || !clients?.length) return 0;

  let opened = 0;
  for (const client of clients as ScheduledClient[]) {
    if (client.status === "archived") continue;
    if (!isInvoiceCadence(client.invoice_cadence)) continue;
    const anchor = dateOnly(client.invoice_anchor_date);
    if (!anchor) continue;
    const mode: InvoiceScheduleMode = client.invoice_schedule_mode === "auto" ? "auto" : "reminder";
    if (client.invoice_schedule_mode !== "auto" && client.invoice_schedule_mode !== "reminder") continue;

    const due = dueRetainerOccurrences({
      anchor,
      cadence: client.invoice_cadence,
      time: normalizeScheduleTime(client.invoice_time),
      timezone,
      now,
      mode,
      reminderDays: client.invoice_reminder_days ?? 0,
      scheduleUpdatedAt: client.invoice_schedule_updated_at,
    });

    for (const occurrence of due) {
      const claim = await supabase
        .from("client_invoice_schedule_runs")
        .insert({
          client_id: client.id,
          user_id: userId,
          occurrence_on: occurrence.occurrenceOn,
          mode,
          status: "open",
          period_label: occurrence.periodLabel,
          invoice_ids: [],
        })
        .select("id")
        .single();

      let runId = claim.data?.id as string | undefined;
      if (claim.error) {
        if (claim.error.code !== "23505") continue;
        const { data: existing } = await supabase
          .from("client_invoice_schedule_runs")
          .select("id, mode, status, invoice_ids")
          .eq("client_id", client.id)
          .eq("occurrence_on", occurrence.occurrenceOn)
          .maybeSingle();
        if (!existing || existing.status !== "open") continue;
        const existingInvoices = Array.isArray(existing.invoice_ids) ? existing.invoice_ids : [];
        if (existingInvoices.length > 0) continue;
        if (existing.mode === mode && mode !== "auto") continue;
        runId = existing.id;
      }
      if (!runId) continue;

      const invoiceIds: string[] = [];
      let detail: string | null = null;

      if (mode === "auto") {
        const { data: projects } = await supabase
          .from("projects")
          .select("id, name, retainer_amount, tax_rate, status")
          .eq("client_id", client.id)
          .eq("status", "active");

        const billable = (projects ?? []).filter(
          (project) => project.retainer_amount != null && Number(project.retainer_amount) > 0
        );

        if (billable.length === 0) {
          detail = "No active project has a retainer amount, so no invoice was created.";
        } else {
          const errors: string[] = [];
          for (const project of billable) {
            const amount = Number(project.retainer_amount);
            const created = await createRetainerDraft(supabase, {
              userId,
              clientId: client.id,
              projectId: project.id,
              projectName: project.name,
              currency: client.currency ?? "USD",
              amount,
              taxRate: resolveTaxRate(project.tax_rate, profile?.tax_rate),
              issuedOn: occurrence.occurrenceOn,
              dueOn: addDaysToDateString(occurrence.occurrenceOn, dueDays),
              periodLabel: occurrence.periodLabel,
              footer: profile?.default_invoice_footer ?? null,
              terms: profile?.default_invoice_terms ?? null,
            });
            if ("error" in created) errors.push(created.error);
            else invoiceIds.push(created.id);
          }
          if (invoiceIds.length === 0 && errors.length > 0) {
            if (!claim.error) {
              await supabase.from("client_invoice_schedule_runs").delete().eq("id", runId);
            }
            continue;
          }
          if (errors.length > 0) {
            detail = "Some retainer invoices could not be created.";
          }
        }
      }

      await supabase
        .from("client_invoice_schedule_runs")
        .update({
          invoice_ids: invoiceIds,
          detail,
          mode,
          period_label: occurrence.periodLabel,
        })
        .eq("id", runId);
      if (!claim.error || invoiceIds.length > 0) opened += 1;
    }
  }

  return opened;
}
