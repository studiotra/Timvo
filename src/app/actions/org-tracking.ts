"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/app/actions/organizations";
import {
  getTasksByProject,
  getTasksByProjectAndService,
  type ClientOpt,
  type ProjectOpt,
  type TaskOpt,
} from "@/app/actions/clients-projects";
import { getServicesForSelect } from "@/app/actions/services";
import {
  getTimeLogs,
  type GetTimeLogsFilters,
  type TimeLogRow,
} from "@/app/actions/time-logs";
import { revalidatePath } from "next/cache";

export type { ClientOpt, ProjectOpt, TaskOpt };

export async function getOrgClientsForSelect(): Promise<ClientOpt[]> {
  const ctx = await getOrgContext();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .eq("organization_id", ctx.org.id)
    .order("name");

  return (data ?? []).map((c) => ({ id: c.id, name: c.name, isOrg: true }));
}

export async function getOrgProjectsByClient(clientId: string): Promise<ProjectOpt[]> {
  const ctx = await getOrgContext();
  if (!ctx || !clientId) return [];

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, organization_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client || client.organization_id !== ctx.org.id) return [];

  const { data } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("name");

  return (data ?? []).map((p) => ({ id: p.id, name: p.name, client_id: p.client_id }));
}

export async function getOrgClientsForTimer(): Promise<ClientOpt[]> {
  return getOrgClientsForSelect();
}

export async function getOrgProjectsForTimer(clientId: string): Promise<
  (ProjectOpt & { clientName?: string; displayName?: string })[]
> {
  const [projs, clients] = await Promise.all([
    getOrgProjectsByClient(clientId),
    getOrgClientsForSelect(),
  ]);
  const clientName = clients.find((c) => c.id === clientId)?.name ?? "";
  return projs.map((p) => ({ ...p, clientName, displayName: p.name }));
}

export async function getOrgServicesForTimer() {
  return getServicesForSelect();
}

export async function getOrgTasksForTimer(projectId: string, serviceId?: string) {
  if (serviceId) return getTasksByProjectAndService(projectId, serviceId);
  return getTasksByProject(projectId);
}

export async function createOrgTask(projectId: string, serviceId: string, name: string) {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!name?.trim()) return { error: "Task name required" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: proj } = await supabase
    .from("projects")
    .select("id, client_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!proj) return { error: "Project not found" };

  const { data: client } = await supabase
    .from("clients")
    .select("organization_id")
    .eq("id", proj.client_id)
    .maybeSingle();
  if (!client || client.organization_id !== ctx.org.id) {
    return { error: "Unauthorized" };
  }

  const { data: svc } = await supabase
    .from("services")
    .select("id, user_id, name")
    .eq("id", serviceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!svc) return { error: "Service not found" };

  const { data, error } = await supabase
    .from("tasks")
    .insert({ project_id: projectId, service_id: serviceId, name: name.trim() })
    .select("id, name, service_id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/org/logs");
  revalidatePath(`/org/clients/${proj.client_id}`);
  return {
    task: {
      id: data.id,
      name: data.name,
      serviceId: data.service_id ?? null,
      serviceName: svc.name ?? null,
    },
  };
}

/** Current user's logs on this org's clients/projects only. */
export async function getOrgTimeLogs(
  view: "week" | "month",
  offsetWeeks = 0,
  filters?: GetTimeLogsFilters
): Promise<TimeLogRow[]> {
  const ctx = await getOrgContext();
  if (!ctx) return [];

  const logs = await getTimeLogs(view, offsetWeeks, filters);
  if (!logs.length) return [];

  const admin = createAdminClient();
  const { data: orgClients } = await admin
    .from("clients")
    .select("id")
    .eq("organization_id", ctx.org.id);
  const orgClientIds = new Set((orgClients ?? []).map((c) => c.id));

  return logs.filter((l) => orgClientIds.has(l.client_id));
}
