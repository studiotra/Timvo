"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ClientOpt = { id: string; name: string };
export type ProjectOpt = { id: string; name: string; client_id: string };

export async function getClientsForSelect(): Promise<ClientOpt[]> {
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

export async function getProjectsByClient(clientId: string): Promise<ProjectOpt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !clientId) return [];
  const { data } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("name");
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, client_id: p.client_id }));
}

export type TaskOpt = { id: string; name: string; serviceId?: string | null; serviceName?: string | null };

export async function getTasksByProject(projectId: string): Promise<TaskOpt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !projectId) return [];
  const { data } = await supabase
    .from("tasks")
    .select("id, name, service_id")
    .eq("project_id", projectId)
    .order("name");
  const tasks = data ?? [];
  const serviceIds = [...new Set(tasks.map((t) => t.service_id).filter(Boolean))] as string[];
  const servicesMap: Record<string, string> = {};
  if (serviceIds.length > 0) {
    const { data: svc } = await supabase.from("services").select("id, name").in("id", serviceIds);
    for (const s of svc ?? []) servicesMap[s.id] = s.name;
  }
  return tasks.map((t) => ({
    id: t.id,
    name: t.name,
    serviceId: t.service_id ?? null,
    serviceName: t.service_id ? servicesMap[t.service_id] ?? null : null,
  }));
}

export async function getTasksByProjectAndService(
  projectId: string,
  serviceId: string
): Promise<TaskOpt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !projectId || !serviceId) return [];
  const { data } = await supabase
    .from("tasks")
    .select("id, name, service_id")
    .eq("project_id", projectId)
    .eq("service_id", serviceId)
    .order("name");
  const tasks = data ?? [];
  const { data: svc } = await supabase.from("services").select("id, name").eq("id", serviceId).single();
  const serviceName = svc?.name ?? null;
  return tasks.map((t) => ({
    id: t.id,
    name: t.name,
    serviceId: t.service_id ?? null,
    serviceName,
  }));
}

export async function createTask(projectId: string, serviceId: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!name?.trim()) return { error: "Task name required" };

  const { data: proj } = await supabase
    .from("projects")
    .select("id, client_id")
    .eq("id", projectId)
    .single();
  if (!proj) return { error: "Project not found" };

  const { data: client } = await supabase
    .from("clients")
    .select("user_id")
    .eq("id", proj.client_id)
    .single();
  if (!client || client.user_id !== user.id) return { error: "Unauthorized" };

  const { data: svc } = await supabase
    .from("services")
    .select("id, user_id")
    .eq("id", serviceId)
    .single();
  if (!svc || svc.user_id !== user.id) return { error: "Service not found" };

  const { data, error } = await supabase
    .from("tasks")
    .insert({ project_id: projectId, service_id: serviceId, name: name.trim() })
    .select("id, name, service_id")
    .single();

  if (error) return { error: error.message };
  const taskData = data as { id: string; name: string; service_id?: string };
  const { data: svcData } = await supabase.from("services").select("name").eq("id", serviceId).single();
  if (proj.client_id) {
    revalidatePath(`/clients/${proj.client_id}`);
    revalidatePath(`/clients/${proj.client_id}/projects/${projectId}`);
  }
  return {
    task: {
      id: taskData.id,
      name: taskData.name,
      serviceId: taskData.service_id ?? null,
      serviceName: svcData?.name ?? null,
    },
  };
}

export async function updateTask(
  projectId: string,
  taskId: string,
  updates: { name?: string; serviceId?: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (updates.name !== undefined && !updates.name?.trim())
    return { error: "Task name required" };

  const { data: proj } = await supabase
    .from("projects")
    .select("id, clients(user_id)")
    .eq("id", projectId)
    .single();
  if (!proj) return { error: "Project not found" };
  const c = proj.clients as unknown as { user_id?: string };
  if (c?.user_id !== user.id) return { error: "Unauthorized" };

  const updatePayload: { name?: string; service_id?: string } = {};
  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.serviceId !== undefined) updatePayload.service_id = updates.serviceId;
  if (Object.keys(updatePayload).length === 0) return { error: "Nothing to update" };

  const { data, error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .eq("project_id", projectId)
    .select("id, name, service_id")
    .single();

  if (error) return { error: error.message };
  const d = data as { id: string; name: string; service_id?: string };
  const svcId = d.service_id;
  const { data: svcData } = svcId
    ? await supabase.from("services").select("name").eq("id", svcId).single()
    : { data: null };
  const { data: projWithClient } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .single();
  if (projWithClient?.client_id) {
    revalidatePath(`/clients/${projWithClient.client_id}`);
    revalidatePath(`/clients/${projWithClient.client_id}/projects/${projectId}`);
  }
  return {
    task: {
      id: d.id,
      name: d.name,
      serviceId: d.service_id ?? null,
      serviceName: svcData?.name ?? null,
    },
  };
}

/** Returns the number of time logs and total minutes for this task. */
export async function getTaskTimeLogCount(taskId: string): Promise<{ count: number; totalMinutes: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !taskId) return { count: 0, totalMinutes: 0 };

  const { data } = await supabase
    .from("time_logs")
    .select("duration_minutes")
    .eq("task_id", taskId)
    .eq("user_id", user.id);

  const logs = data ?? [];
  const totalMinutes = logs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
  return { count: logs.length, totalMinutes };
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: task } = await supabase
    .from("tasks")
    .select("id, project_id, projects(client_id, clients(user_id))")
    .eq("id", taskId)
    .single();
  if (!task) return { error: "Task not found" };
  const proj = task.projects as unknown as { client_id?: string; clients?: { user_id?: string } };
  if (proj?.clients?.user_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };
  const clientId = proj?.client_id;
  if (clientId) {
    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/clients/${clientId}/projects/${task.project_id}`);
  }
  return { success: true };
}
