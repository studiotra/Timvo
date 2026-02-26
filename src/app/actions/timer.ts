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

export async function getProjectsForTimer(clientId: string): Promise<ProjectOption[]> {
  const projs = await getProjectsByClient(clientId);
  const clients = await getClientsForSelect();
  const clientName = clients.find((c) => c.id === clientId)?.name ?? "";
  return projs.map((p) => ({ ...p, clientName, displayName: p.name }));
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
        displayName: `${p.name} (${c.name})`,
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

export async function getActiveTimer(): Promise<ActiveTimer> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("time_logs")
    .select("id, started_at, projects(id, name, clients(name)), tasks(name)")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.projects) return null;
  const proj = data.projects as unknown as { id: string; name: string; clients?: { name?: string } };
  const task = data.tasks as unknown as { name?: string } | null;
  return {
    id: data.id,
    projectId: proj.id,
    projectName: proj.name ?? "",
    clientName: proj.clients?.name ?? "",
    taskName: task?.name,
    startedAt: data.started_at,
  };
}
