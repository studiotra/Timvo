"use server";

import { createClient } from "@/lib/supabase/server";

export type PeriodRevenue = { period: string; amount: number };

export async function getRevenueByPeriod(): Promise<PeriodRevenue[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, total_amount, issued_at, created_at")
    .eq("user_id", user.id)
    .eq("status", "paid");

  const paid = (invoices ?? []).filter((i) => i.total_amount != null);
  const results: PeriodRevenue[] = [];

  const getDate = (row: { issued_at?: string | null; created_at?: string | null }) => {
    const d = row.issued_at ?? row.created_at;
    return d ? new Date(d) : null;
  };

  const thisMonth = paid.filter((i) => {
    const d = getDate(i);
    return d && d >= startOfMonth;
  });
  results.push({
    period: `${now.toLocaleString("default", { month: "short" })} ${now.getFullYear()}`,
    amount: thisMonth.reduce((s, i) => s + Number(i.total_amount), 0),
  });

  const lastMonth = paid.filter((i) => {
    const d = getDate(i);
    return d && d >= startOfLastMonth && d <= endOfLastMonth;
  });
  results.push({
    period: `${startOfLastMonth.toLocaleString("default", { month: "short" })} ${startOfLastMonth.getFullYear()}`,
    amount: lastMonth.reduce((s, i) => s + Number(i.total_amount), 0),
  });

  const thisYear = paid.filter((i) => {
    const d = getDate(i);
    return d && d >= startOfYear;
  });
  results.push({
    period: `${now.getFullYear()} YTD`,
    amount: thisYear.reduce((s, i) => s + Number(i.total_amount), 0),
  });

  return results;
}

/** Fetch paid invoices with client info for revenue by client. */
export async function getRevenueByClient(): Promise<
  { clientId: string; clientName: string; amount: number }[]
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("invoices")
    .select("id, total_amount, client_id, clients(name)")
    .eq("user_id", user.id)
    .eq("status", "paid");

  const map = new Map<string, { name: string; amount: number }>();
  for (const r of rows ?? []) {
    if (r.total_amount == null) continue;
    const clientId = r.client_id as string;
    const name = (r.clients as { name?: string } | null)?.name ?? "Unknown";
    const existing = map.get(clientId);
    if (existing) {
      existing.amount += Number(r.total_amount);
    } else {
      map.set(clientId, { name, amount: Number(r.total_amount) });
    }
  }

  return [...map.entries()].map(([clientId, { name, amount }]) => ({
    clientId,
    clientName: name,
    amount,
  }));
}

/** Monthly revenue for last 12 months — for income stability view. */
export async function getIncomeStability(): Promise<{ month: string; amount: number }[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: invoices } = await supabase
    .from("invoices")
    .select("total_amount, issued_at, created_at")
    .eq("user_id", user.id)
    .eq("status", "paid");

  const paid = (invoices ?? []).filter((i) => i.total_amount != null);
  const getDate = (row: { issued_at?: string | null; created_at?: string | null }) => {
    const d = row.issued_at ?? row.created_at;
    return d ? new Date(d) : null;
  };

  const now = new Date();
  const result: { month: string; amount: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const sum = paid
      .filter((inv) => {
        const date = getDate(inv);
        return date && date >= start && date <= end;
      })
      .reduce((s, inv) => s + Number(inv.total_amount), 0);
    result.push({
      month: start.toLocaleString("default", { month: "short", year: "2-digit" }),
      amount: sum,
    });
  }
  return result;
}

export type UnderpricedProject = {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  effectiveRate: number;
  targetRate: number;
  totalHours: number;
  revenue: number;
};

/** Projects where effective rate is below 70% of target/project rate. */
export async function getUnderpricedProjects(): Promise<UnderpricedProject[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("target_hourly_rate")
    .eq("id", user.id)
    .single();
  const targetRate = profile?.target_hourly_rate != null ? Number(profile.target_hourly_rate) : null;
  if (targetRate == null || targetRate <= 0) return [];

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id);
  const clientIds = (clients ?? []).map((c) => c.id);
  if (clientIds.length === 0) return [];

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client_id, hourly_rate")
    .in("client_id", clientIds);

  const projectIds = (projects ?? []).map((p) => p.id);
  if (projectIds.length === 0) return [];

  const [{ data: invoices }, { data: logs }] = await Promise.all([
    supabase
      .from("invoices")
      .select("project_id, total_amount")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .in("project_id", projectIds),
    supabase
      .from("time_logs")
      .select("project_id, duration_minutes")
      .eq("user_id", user.id)
      .in("project_id", projectIds),
  ]);

  const revenueByProject = new Map<string, number>();
  const minutesByProject = new Map<string, number>();
  for (const i of invoices ?? []) {
    const pid = i.project_id as string | null;
    if (!pid || i.total_amount == null) continue;
    revenueByProject.set(pid, (revenueByProject.get(pid) ?? 0) + Number(i.total_amount));
  }
  for (const l of logs ?? []) {
    const pid = l.project_id as string;
    const min = l.duration_minutes ?? 0;
    minutesByProject.set(pid, (minutesByProject.get(pid) ?? 0) + min);
  }

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const alerts: UnderpricedProject[] = [];

  for (const p of projects ?? []) {
    const revenue = revenueByProject.get(p.id) ?? 0;
    const totalMinutes = minutesByProject.get(p.id) ?? 0;
    const totalHours = totalMinutes / 60;
    if (totalHours < 0.5) continue;
    const effectiveRate = revenue / totalHours;
    const projectRate = p.hourly_rate != null ? Number(p.hourly_rate) : null;
    const compareRate = projectRate != null && projectRate > 0 ? projectRate : targetRate;
    if (effectiveRate < compareRate * 0.7) {
      alerts.push({
        projectId: p.id,
        projectName: p.name,
        clientId: p.client_id,
        clientName: clientMap.get(p.client_id) ?? "Unknown",
        effectiveRate,
        targetRate: compareRate,
        totalHours,
        revenue,
      });
    }
  }

  return alerts.sort((a, b) => a.effectiveRate - b.effectiveRate);
}
