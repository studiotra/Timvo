"use server";

import { createClient } from "@/lib/supabase/server";

export type ClientOption = { id: string; name: string };
export type ProjectOption = { id: string; name: string; clientId: string };
export type UnbilledLog = {
  id: string;
  task_id: string | null;
  task_name: string | null;
  description: string | null;
  duration_minutes: number;
  amount: number;
  service_id?: string | null;
  service_billing_type?: string;
  service_default_rate?: number;
};

export async function getClientsForInvoice(): Promise<ClientOption[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");
  return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
}

export async function getProjectsForInvoice(clientId: string): Promise<ProjectOption[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("name");
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, clientId }));
}

export async function getUnbilledLogs(
  projectId: string,
  dateFrom?: string | null,
  dateTo?: string | null
): Promise<UnbilledLog[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  let query = supabase
    .from("time_logs")
    .select("id, duration_minutes, description, started_at, task_id, task:task_id(name), projects(hourly_rate)")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .eq("is_billable", true)
    .eq("is_billed", false)
    .order("started_at");

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
  const servicesMap: Record<string, { default_rate?: number; billing_type?: string }> = {};
  if (serviceIds.length > 0) {
    const { data: svcData } = await supabase
      .from("services")
      .select("id, default_rate, billing_type")
      .in("id", serviceIds);
    for (const s of svcData ?? []) {
      servicesMap[s.id] = { default_rate: s.default_rate ?? undefined, billing_type: s.billing_type ?? "hourly" };
    }
  }
  return data.map((log) => {
    const projRate = Number((log.projects as { hourly_rate?: number })?.hourly_rate) || 0;
    const task = log.task as { name?: string } | null;
    const serviceId = log.task_id ? (tasksWithService[log.task_id] ?? null) : null;
    const svc = serviceId ? servicesMap[serviceId] : null;
    const isFixed = svc?.billing_type === "fixed";
    const serviceRate = svc?.default_rate != null ? Number(svc.default_rate) : 0;
    const rate = serviceRate > 0 ? serviceRate : projRate;
    const mins = log.duration_minutes ?? 0;
    const hours = mins / 60;
    const amount = isFixed ? 0 : Math.round(hours * rate * 100) / 100;
    return {
      id: log.id,
      task_id: log.task_id ?? null,
      task_name: task?.name ?? null,
      description: log.description,
      duration_minutes: mins,
      amount,
      service_id: serviceId ?? null,
      service_billing_type: svc?.billing_type ?? "hourly",
      service_default_rate: serviceRate,
    };
  });
}
