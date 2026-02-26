"use server";

import { createClient } from "@/lib/supabase/server";

export type EffectiveRateRow = {
  revenue: number;
  totalHours: number;
  billableHours: number;
  effectiveRate: number | null;
  targetRate: number | null;
};

export type ProjectEffectiveRate = EffectiveRateRow & { projectId: string; projectName: string };
export type ClientEffectiveRate = EffectiveRateRow & { clientId: string; clientName: string };

/** Business-level effective rate: total paid revenue ÷ total logged hours. */
export async function getBusinessEffectiveRate(): Promise<
  EffectiveRateRow & { targetRate: number | null }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { revenue: 0, totalHours: 0, billableHours: 0, effectiveRate: null, targetRate: null };

  const [{ data: invoices }, { data: logs }, { data: profile }] = await Promise.all([
    supabase
      .from("invoices")
      .select("total_amount")
      .eq("user_id", user.id)
      .eq("status", "paid"),
    supabase.from("time_logs").select("duration_minutes, is_billable").eq("user_id", user.id),
    supabase.from("profiles").select("target_hourly_rate").eq("id", user.id).single(),
  ]);

  const revenue = (invoices ?? [])
    .filter((i) => i.total_amount != null)
    .reduce((s, i) => s + Number(i.total_amount), 0);

  let totalMinutes = 0;
  let billableMinutes = 0;
  for (const l of logs ?? []) {
    const min = l.duration_minutes ?? 0;
    totalMinutes += min;
    if (l.is_billable) billableMinutes += min;
  }
  const totalHours = totalMinutes / 60;
  const billableHours = billableMinutes / 60;
  const effectiveRate = totalHours > 0 ? revenue / totalHours : null;
  const targetRate = profile?.target_hourly_rate != null ? Number(profile.target_hourly_rate) : null;

  return { revenue, totalHours, billableHours, effectiveRate, targetRate };
}

/** Per-project effective rates for a client. */
export async function getProjectEffectiveRates(clientId: string): Promise<ProjectEffectiveRate[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !clientId) return [];

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", clientId);

  if (!projects?.length) return [];

  const projectIds = projects.map((p) => p.id);

  const [{ data: invoices }, { data: logs }] = await Promise.all([
    supabase
      .from("invoices")
      .select("project_id, total_amount")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .in("project_id", projectIds),
    supabase
      .from("time_logs")
      .select("project_id, duration_minutes, is_billable")
      .eq("user_id", user.id)
      .in("project_id", projectIds),
  ]);

  const revenueByProject = new Map<string, number>();
  const totalMinutesByProject = new Map<string, number>();
  const billableMinutesByProject = new Map<string, number>();

  for (const i of invoices ?? []) {
    const pid = i.project_id as string | null;
    if (!pid || i.total_amount == null) continue;
    revenueByProject.set(pid, (revenueByProject.get(pid) ?? 0) + Number(i.total_amount));
  }
  for (const l of logs ?? []) {
    const pid = l.project_id as string;
    const min = l.duration_minutes ?? 0;
    totalMinutesByProject.set(pid, (totalMinutesByProject.get(pid) ?? 0) + min);
    if (l.is_billable) {
      billableMinutesByProject.set(pid, (billableMinutesByProject.get(pid) ?? 0) + min);
    }
  }

  return projects.map((p) => {
    const revenue = revenueByProject.get(p.id) ?? 0;
    const totalMinutes = totalMinutesByProject.get(p.id) ?? 0;
    const billableMinutes = billableMinutesByProject.get(p.id) ?? 0;
    const totalHours = totalMinutes / 60;
    const billableHours = billableMinutes / 60;
    const effectiveRate = totalHours > 0 ? revenue / totalHours : null;
    return {
      projectId: p.id,
      projectName: p.name,
      revenue,
      totalHours,
      billableHours,
      effectiveRate,
      targetRate: null,
    };
  });
}

/** Per-client effective rates for profitability ranking. */
export async function getClientEffectiveRates(): Promise<ClientEffectiveRate[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id);

  if (!clients?.length) return [];

  const clientIds = clients.map((c) => c.id);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, client_id")
    .in("client_id", clientIds);

  const projectToClient = new Map<string, string>();
  for (const p of projects ?? []) {
    projectToClient.set(p.id, p.client_id);
  }
  const projectIds = projects?.map((p) => p.id) ?? [];
  if (projectIds.length === 0) return [];

  const [{ data: invoices }, { data: logs }] = await Promise.all([
    supabase
      .from("invoices")
      .select("client_id, total_amount")
      .eq("user_id", user.id)
      .eq("status", "paid"),
    supabase
      .from("time_logs")
      .select("project_id, duration_minutes, is_billable")
      .eq("user_id", user.id)
      .in("project_id", projectIds),
  ]);

  const revenueByClient = new Map<string, number>();
  const totalMinutesByClient = new Map<string, number>();
  const billableMinutesByClient = new Map<string, number>();

  for (const i of invoices ?? []) {
    const cid = i.client_id as string;
    if (i.total_amount == null) continue;
    revenueByClient.set(cid, (revenueByClient.get(cid) ?? 0) + Number(i.total_amount));
  }
  for (const l of logs ?? []) {
    const pid = l.project_id as string;
    const cid = projectToClient.get(pid);
    if (!cid) continue;
    const min = l.duration_minutes ?? 0;
    totalMinutesByClient.set(cid, (totalMinutesByClient.get(cid) ?? 0) + min);
    if (l.is_billable) {
      billableMinutesByClient.set(cid, (billableMinutesByClient.get(cid) ?? 0) + min);
    }
  }

  return clients.map((c) => {
    const revenue = revenueByClient.get(c.id) ?? 0;
    const totalMinutes = totalMinutesByClient.get(c.id) ?? 0;
    const billableMinutes = billableMinutesByClient.get(c.id) ?? 0;
    const totalHours = totalMinutes / 60;
    const billableHours = billableMinutes / 60;
    const effectiveRate = totalHours > 0 ? revenue / totalHours : null;
    return {
      clientId: c.id,
      clientName: c.name,
      revenue,
      totalHours,
      billableHours,
      effectiveRate,
      targetRate: null,
    };
  });
}
