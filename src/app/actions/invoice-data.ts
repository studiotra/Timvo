"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getClientsForSelect,
  getProjectsByClient,
} from "@/app/actions/clients-projects";
import { hourlyLogAmount, resolveHourlyRate, type RateSource } from "@/lib/rates";

export type ClientOption = { id: string; name: string };
export type ProjectOption = {
  id: string;
  name: string;
  clientId: string;
  billing_type?: "hourly" | "fixed";
  agreed_fee?: number | null;
  tax_rate?: number | null;
  hourly_rate?: number | null;
};
export type UnbilledLog = {
  id: string;
  task_id: string | null;
  task_name: string | null;
  description: string | null;
  duration_minutes: number;
  amount: number;
  rate: number;
  rate_source: RateSource;
  missing_rate: boolean;
  started_at?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  service_billing_type?: string;
  service_default_rate?: number;
};

/** Same client set as Logs / timer — includes org clients like "ABC (NARU)". */
export async function getClientsForInvoice(): Promise<ClientOption[]> {
  const clients = await getClientsForSelect();
  return clients.map((c) => ({ id: c.id, name: c.name }));
}

export async function getProjectsForInvoice(clientId: string): Promise<ProjectOption[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !clientId) return [];

  // Resolve accessible project ids (own + org contractor assignments)
  const accessible = await getProjectsByClient(clientId);
  if (accessible.length === 0) return [];

  const ids = accessible.map((p) => p.id);
  const { data } = await supabase
    .from("projects")
    .select("id, name, billing_type, agreed_fee, tax_rate, hourly_rate")
    .in("id", ids)
    .eq("status", "active")
    .order("name");

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    clientId,
    billing_type: (p.billing_type ?? "hourly") as "hourly" | "fixed",
    agreed_fee: p.agreed_fee != null ? Number(p.agreed_fee) : null,
    tax_rate: p.tax_rate != null ? Number(p.tax_rate) : null,
    hourly_rate: p.hourly_rate != null ? Number(p.hourly_rate) : null,
  }));
}

export async function getUnbilledLogs(
  projectId: string,
  dateFrom?: string | null,
  dateTo?: string | null
): Promise<UnbilledLog[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: project } = await supabase
    .from("projects")
    .select("billing_type, hourly_rate")
    .eq("id", projectId)
    .single();
  const isFixedProject = project?.billing_type === "fixed";
  const projectRate =
    project?.hourly_rate != null ? Number(project.hourly_rate) : null;

  let query = supabase
    .from("time_logs")
    .select("id, duration_minutes, description, started_at, task_id, task:task_id(name)")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .eq("is_billed", false)
    .order("started_at");
  if (!isFixedProject) {
    query = query.eq("is_billable", true);
  }

  if (dateFrom) {
    query = query.gte("started_at", `${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    query = query.lte("started_at", end.toISOString());
  }

  const { data } = await query;

  if (!data) return [];
  const taskIds = [...new Set(data.map((l) => l.task_id).filter(Boolean))] as string[];
  const tasksWithService: Record<string, string | null> = {};
  if (taskIds.length > 0) {
    const { data: taskRows } = await supabase
      .from("tasks")
      .select("id, service_id")
      .in("id", taskIds);
    for (const t of taskRows ?? []) tasksWithService[t.id] = t.service_id ?? null;
  }
  const serviceIds = [...new Set(Object.values(tasksWithService).filter(Boolean))] as string[];
  const servicesMap: Record<string, { name?: string; default_rate?: number; billing_type?: string }> = {};
  if (serviceIds.length > 0) {
    const { data: svcData } = await supabase
      .from("services")
      .select("id, name, default_rate, billing_type")
      .in("id", serviceIds);
    for (const s of svcData ?? []) {
      servicesMap[s.id] = {
        name: s.name ?? undefined,
        default_rate: s.default_rate ?? undefined,
        billing_type: s.billing_type ?? "hourly",
      };
    }
  }
  return data.map((log) => {
    const task = log.task as { name?: string } | null;
    const serviceId = log.task_id ? (tasksWithService[log.task_id] ?? null) : null;
    const svc = serviceId ? servicesMap[serviceId] : null;
    const serviceName = svc?.name ?? null;
    const isFixed = svc?.billing_type === "fixed";
    const serviceRate = svc?.default_rate != null ? Number(svc.default_rate) : null;
    const resolved = resolveHourlyRate({
      projectRate,
      serviceRate,
    });
    const mins = log.duration_minutes ?? 0;
    const amount = isFixed ? 0 : hourlyLogAmount(mins, resolved);
    return {
      id: log.id,
      task_id: log.task_id ?? null,
      task_name: task?.name ?? null,
      description: log.description,
      duration_minutes: mins,
      amount,
      rate: isFixed ? (serviceRate ?? 0) : resolved.rate,
      rate_source: isFixed ? "service" : resolved.source,
      missing_rate: isFixed ? false : resolved.missing,
      started_at: log.started_at ?? null,
      service_id: serviceId ?? null,
      service_name: serviceName,
      service_billing_type: svc?.billing_type ?? "hourly",
      service_default_rate: serviceRate ?? 0,
    };
  });
}
