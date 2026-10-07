"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getClientsForSelect,
  getProjectsByClient,
  getTasksByProject,
  getTasksByProjectAndService,
  createTask as createTaskAction,
  type TaskOpt,
} from "./clients-projects";
import { getServicesForSelect } from "./services";
import { formatProjectOptionLabel } from "@/lib/dates";

export type ClientOption = { id: string; name: string };
export type { TaskOpt };
export type ProjectOption = {
  id: string;
  name: string;
  client_id: string;
  clientName?: string;
  displayName?: string;
};

export async function getClientsForTimer(): Promise<ClientOption[]> {
  return getClientsForSelect();
}

export async function getProjectsForTimer(
  clientId: string,
  clientName = ""
): Promise<ProjectOption[]> {
  const projs = await getProjectsByClient(clientId);
  return projs.map((p) => ({
    ...p,
    clientName,
    displayName: formatProjectOptionLabel(p.name, clientName),
  }));
}

/** Fetch all projects across clients for the timer bar (no client filter). */
export async function getAllProjectsForTimer(): Promise<ProjectOption[]> {
  const clients = await getClientsForSelect();
  const allProjects: ProjectOption[] = [];
  for (const c of clients) {
    const projs = await getProjectsByClient(c.id);
    for (const p of projs) {
      allProjects.push({
        ...p,
        clientName: c.name,
        displayName: formatProjectOptionLabel(p.name, c.name),
      });
    }
  }
  return allProjects;
}

export type ServiceOption = { id: string; name: string; default_rate?: number | null; billing_type?: string };

export async function getServicesForTimer(): Promise<ServiceOption[]> {
  return getServicesForSelect();
}

export async function getTasksForTimer(projectId: string, serviceId?: string): Promise<TaskOpt[]> {
  if (serviceId) return getTasksByProjectAndService(projectId, serviceId);
  return getTasksByProject(projectId);
}

export async function createTask(projectId: string, serviceId: string, name: string) {
  return createTaskAction(projectId, serviceId, name);
}

export type ActiveTimer = {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  taskName?: string;
  startedAt: string;
} | null;

async function resolveClientLabel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string | null | undefined
): Promise<string> {
  if (!clientId) return "";
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, organization_id, organizations(name)")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return "";
  if (client.organization_id) {
    const org = client.organizations as unknown as { name?: string } | null;
    // Prefer agency/org when present so running timer shows "project · Space Creatorz"
    return org?.name?.trim() || client.name || "";
  }
  return client.name || "";
}

export async function getActiveTimer(): Promise<ActiveTimer> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Avoid nested projects→clients joins (can hit RLS recursion); resolve client separately.
  const { data } = await supabase
    .from("time_logs")
    .select("id, started_at, project_id, projects(id, name, client_id), tasks(name)")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.projects) return null;
  const proj = data.projects as unknown as {
    id: string;
    name: string;
    client_id?: string;
  };
  const task = data.tasks as unknown as { name?: string } | null;
  const clientName = await resolveClientLabel(supabase, proj.client_id);

  return {
    id: data.id,
    projectId: proj.id,
    projectName: proj.name ?? "",
    clientName,
    taskName: task?.name,
    startedAt: data.started_at,
  };
}
