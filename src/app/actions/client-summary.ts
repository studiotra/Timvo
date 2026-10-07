"use server";

import { createClient } from "@/lib/supabase/server";
import { hourlyLogAmount, resolveHourlyRate } from "@/lib/rates";
import {
  buildClientSummary,
  type ClientSummary,
} from "@/lib/clients/summary";

/** Hours, unbilled $, and invoice totals for a freelancer's client. */
export async function getClientBillingSummary(
  clientId: string
): Promise<ClientSummary> {
  const empty = buildClientSummary({
    totalMinutes: 0,
    unbilledAmount: 0,
    invoiceTotal: 0,
    paidInvoiceTotal: 0,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !clientId) return empty;

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!client) return empty;

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("client_id", clientId);
  const projectIds = (projects ?? []).map((p) => p.id);

  const [{ data: invoices }, logsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("total_amount, status")
      .eq("user_id", user.id)
      .eq("client_id", clientId),
    projectIds.length > 0
      ? supabase
          .from("time_logs")
          .select(
            "duration_minutes, is_billable, is_billed, projects(hourly_rate), tasks(service_id)"
          )
          .eq("user_id", user.id)
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] as Array<{
          duration_minutes: number | null;
          is_billable: boolean | null;
          is_billed: boolean | null;
          projects: unknown;
          tasks: unknown;
        }> }),
  ]);

  let invoiceTotal = 0;
  let paidInvoiceTotal = 0;
  for (const inv of invoices ?? []) {
    const amount = inv.total_amount != null ? Number(inv.total_amount) : 0;
    invoiceTotal += amount;
    if (inv.status === "paid") paidInvoiceTotal += amount;
  }

  const logs = logsRes.data ?? [];
  let totalMinutes = 0;
  const serviceIds = [
    ...new Set(
      logs
        .map((l) => {
          const task = l.tasks as { service_id?: string | null } | null;
          return task?.service_id ?? null;
        })
        .filter(Boolean)
    ),
  ] as string[];

  const servicesRateMap: Record<string, number | null> = {};
  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from("services")
      .select("id, default_rate")
      .in("id", serviceIds);
    for (const s of services ?? []) {
      servicesRateMap[s.id] =
        s.default_rate != null ? Number(s.default_rate) : null;
    }
  }

  let unbilledAmount = 0;
  for (const log of logs) {
    totalMinutes += log.duration_minutes ?? 0;
    if (!log.is_billable || log.is_billed) continue;
    const proj = log.projects as { hourly_rate?: number | null } | null;
    const task = log.tasks as { service_id?: string | null } | null;
    const serviceId = task?.service_id ?? null;
    const resolved = resolveHourlyRate({
      projectRate: proj?.hourly_rate,
      serviceRate: serviceId ? servicesRateMap[serviceId] : null,
    });
    unbilledAmount += hourlyLogAmount(log.duration_minutes ?? 0, resolved);
  }

  return buildClientSummary({
    totalMinutes,
    unbilledAmount,
    invoiceTotal,
    paidInvoiceTotal,
  });
}
