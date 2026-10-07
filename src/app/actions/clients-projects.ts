"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildSortOrderUpdates,
  isMissingColumnError,
  normalizeDueDate,
} from "@/lib/tasks/fields";

export type ClientOpt = { id: string; name: string; isOrg?: boolean };
export type ProjectOpt = { id: string; name: string; client_id: string };

export async function getClientsForSelect(): Promise<ClientOpt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: ownClients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  const own = (ownClients ?? []).map((c) => ({ id: c.id, name: c.name, isOrg: false }));

  // Avoid nested projects→clients joins (RLS recursion). Resolve via project_contractors first.
  const { data: assignments } = await supabase
    .from("project_contractors")
    .select("project_id")
    .eq("contractor_user_id", user.id);

  const projectIds = [...new Set((assignments ?? []).map((a) => a.project_id))];
  const orgClients = new Map<string, ClientOpt>();

  if (projectIds.length) {
    const { data: projects } = await supabase
      .from("projects")
      .select("client_id")
      .in("id", projectIds);

    const clientIds = [...new Set((projects ?? []).map((p) => p.client_id).filter(Boolean))];
    if (clientIds.length) {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, organization_id, organizations(name)")
        .in("id", clientIds);

      for (const client of clients ?? []) {
        if (!client.organization_id) continue;
        const org = client.organizations as unknown as { name: string } | null;
        orgClients.set(client.id, {
          id: client.id,
          name: `${client.name} (${org?.name ?? "Organization"})`,
          isOrg: true,
        });
      }
    }
  }

  return [...own, ...orgClients.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProjectsByClient(clientId: string): Promise<ProjectOpt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !clientId) return [];

  const { data: client } = await supabase
    .from("clients")
    .select("id, user_id, organization_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return [];

  if (client.organization_id) {
    const { data: assignments } = await supabase
      .from("project_contractors")
      .select("project_id, projects(id, name, client_id, status)")
      .eq("contractor_user_id", user.id);

    return (assignments ?? [])
      .map((a) => {
        const project = a.projects as unknown as {
          id: string;
          name: string;
          client_id: string;
          status: string;
        } | null;
        if (!project || project.client_id !== clientId || project.status !== "active") {
          return null;
        }
        return { id: project.id, name: project.name, client_id: project.client_id };
      })
      .filter(Boolean) as ProjectOpt[];
  }

  const { data } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("name");
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, client_id: p.client_id }));
}

export type TaskOpt = {
  id: string;
  name: string;
  serviceId?: string | null;
  serviceName?: string | null;
  isDone?: boolean;
  dueDate?: string | null;
  sortOrder?: number;
};

async function mapTasksWithServices(
  supabase: SupabaseClient,
  tasks: Array<{
    id: string;
    name: string;
    service_id?: string | null;
    is_done?: boolean | null;
    due_date?: string | null;
    sort_order?: number | null;
  }>
): Promise<TaskOpt[]> {
  const serviceIds = [
    ...new Set(tasks.map((t) => t.service_id).filter(Boolean)),
  ] as string[];
  const servicesMap: Record<string, string> = {};
  if (serviceIds.length > 0) {
    const { data: svc } = await supabase
      .from("services")
      .select("id, name")
      .in("id", serviceIds);
    for (const s of svc ?? []) servicesMap[s.id] = s.name;
  }
  return tasks.map((t) => ({
    id: t.id,
    name: t.name,
    serviceId: t.service_id ?? null,
    serviceName: t.service_id ? servicesMap[t.service_id] ?? null : null,
    isDone: !!t.is_done,
    dueDate: t.due_date ?? null,
    sortOrder: t.sort_order ?? 0,
  }));
}

/** Load tasks; prefer optional columns, fall back if migration not applied. */
export async function getTasksByProject(projectId: string): Promise<TaskOpt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !projectId) return [];

  const withExtras = await supabase
    .from("tasks")
    .select("id, name, service_id, is_done, due_date, sort_order")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("name");

  if (!withExtras.error) {
    return mapTasksWithServices(supabase, withExtras.data ?? []);
  }

  const { data } = await supabase
    .from("tasks")
    .select("id, name, service_id")
    .eq("project_id", projectId)
    .order("name");
  return mapTasksWithServices(supabase, data ?? []);
}

export async function getTasksByProjectAndService(
  projectId: string,
  serviceId: string
): Promise<TaskOpt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !projectId || !serviceId) return [];

  const withExtras = await supabase
    .from("tasks")
    .select("id, name, service_id, is_done, due_date, sort_order")
    .eq("project_id", projectId)
    .eq("service_id", serviceId)
    .order("sort_order")
    .order("name");

  const rows = withExtras.error
    ? (
        await supabase
          .from("tasks")
          .select("id, name, service_id")
          .eq("project_id", projectId)
          .eq("service_id", serviceId)
          .order("name")
      ).data ?? []
    : withExtras.data ?? [];

  return mapTasksWithServices(supabase, rows);
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
    .select("user_id, organization_id")
    .eq("id", proj.client_id)
    .single();
  if (!client) return { error: "Unauthorized" };

  let allowed = client.user_id === user.id;
  if (!allowed && client.organization_id) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", client.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();
    allowed = Boolean(membership);
  }
  if (!allowed) return { error: "Unauthorized" };

  const { data: svc } = await supabase
    .from("services")
    .select("id, user_id")
    .eq("id", serviceId)
    .single();
  if (!svc || svc.user_id !== user.id) return { error: "Service not found" };

  let nextSort = 0;
  const existingRes = await supabase
    .from("tasks")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (
    !existingRes.error &&
    existingRes.data?.[0] &&
    typeof existingRes.data[0].sort_order === "number"
  ) {
    nextSort = existingRes.data[0].sort_order + 1;
  } else {
    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);
    nextSort = count ?? 0;
  }

  const insertWithSort = {
    project_id: projectId,
    service_id: serviceId,
    name: name.trim(),
    sort_order: nextSort,
    is_done: false,
  };
  let { data, error } = await supabase
    .from("tasks")
    .insert(insertWithSort)
    .select("id, name, service_id")
    .single();

  if (error && isMissingColumnError(error.message)) {
    const fallback = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        service_id: serviceId,
        name: name.trim(),
      })
      .select("id, name, service_id")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

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
      isDone: false,
      dueDate: null,
      sortOrder: nextSort,
    },
  };
}

export async function updateTask(
  projectId: string,
  taskId: string,
  updates: {
    name?: string;
    serviceId?: string;
    isDone?: boolean;
    dueDate?: string | null;
  }
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

  const updatePayload: {
    name?: string;
    service_id?: string;
    is_done?: boolean;
    due_date?: string | null;
  } = {};
  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.serviceId !== undefined) updatePayload.service_id = updates.serviceId;
  if (updates.isDone !== undefined) updatePayload.is_done = updates.isDone;
  if (updates.dueDate !== undefined) {
    const due = normalizeDueDate(updates.dueDate);
    if (!due.ok) return { error: due.error };
    updatePayload.due_date = due.dueDate;
  }
  if (Object.keys(updatePayload).length === 0) return { error: "Nothing to update" };

  let data: {
    id: string;
    name: string;
    service_id?: string | null;
    is_done?: boolean | null;
    due_date?: string | null;
    sort_order?: number | null;
  } | null = null;
  let error: { message: string } | null = null;

  const primary = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .eq("project_id", projectId)
    .select("id, name, service_id, is_done, due_date, sort_order")
    .single();
  data = primary.data;
  error = primary.error;

  if (error && isMissingColumnError(error.message)) {
    const baseOnly: { name?: string; service_id?: string } = {};
    if (updatePayload.name !== undefined) baseOnly.name = updatePayload.name;
    if (updatePayload.service_id !== undefined)
      baseOnly.service_id = updatePayload.service_id;
    if (Object.keys(baseOnly).length === 0) {
      return {
        error:
          "Done, due date, and reorder need a database update. Ask an admin to apply the tasks migration.",
      };
    }
    const fallback = await supabase
      .from("tasks")
      .update(baseOnly)
      .eq("id", taskId)
      .eq("project_id", projectId)
      .select("id, name, service_id")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return { error: error.message };
  if (!data) return { error: "Task not found" };
  const d = data;
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
      isDone: !!d.is_done,
      dueDate: d.due_date ?? null,
      sortOrder: d.sort_order ?? 0,
    },
  };
}

/** Reorder real tasks within a project. orderedIds is top-to-bottom. */
export async function reorderTasks(projectId: string, orderedIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!orderedIds.length) return { error: "Nothing to reorder" };

  const { data: proj } = await supabase
    .from("projects")
    .select("id, client_id, clients(user_id)")
    .eq("id", projectId)
    .single();
  if (!proj) return { error: "Project not found" };
  const c = proj.clients as unknown as { user_id?: string };
  if (c?.user_id !== user.id) return { error: "Unauthorized" };

  const updates = buildSortOrderUpdates(orderedIds);
  for (const u of updates) {
    const { error } = await supabase
      .from("tasks")
      .update({ sort_order: u.sortOrder })
      .eq("id", u.id)
      .eq("project_id", projectId);
    if (error) {
      if (isMissingColumnError(error.message)) {
        return {
          error:
            "Task reordering needs a database update. Ask an admin to apply the tasks migration.",
        };
      }
      return { error: error.message };
    }
  }

  if (proj.client_id) {
    revalidatePath(`/clients/${proj.client_id}`);
    revalidatePath(`/clients/${proj.client_id}/projects/${projectId}`);
  }
  return { success: true };
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
