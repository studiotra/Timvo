"use server";

import { createClient } from "@/lib/supabase/server";

export type ClientOption = { id: string; name: string };
export type ProjectOption = { id: string; name: string; clientId: string };
export type UnbilledLog = {
  id: string;
  description: string | null;
  duration_minutes: number;
  amount: number;
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
    .select("id, duration_minutes, description, started_at, projects(hourly_rate)")
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
  return data.map((log) => {
    const rate = Number((log.projects as { hourly_rate?: number })?.hourly_rate) || 0;
    const mins = log.duration_minutes ?? 0;
    const hours = mins / 60;
    const amount = Math.round(hours * rate * 100) / 100;
    return {
      id: log.id,
      description: log.description,
      duration_minutes: mins,
      amount,
    };
  });
}
