import type { SupabaseClient } from "@supabase/supabase-js";

export type SlackProject = {
  id: string;
  name: string;
  clientName: string;
};

export type SlackService = { id: string; name: string };
export type SlackTask = { id: string; name: string };

export type SlackActiveTimer = {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  serviceName?: string;
  taskName?: string;
  startedAt: string;
};

export async function listActiveProjectsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<SlackProject[]> {
  const { data } = await supabase
    .from("projects")
    .select("id, name, status, clients!inner(id, name, user_id)")
    .eq("clients.user_id", userId)
    .eq("status", "active")
    .order("name");

  return (data ?? []).map((p) => {
    const client = p.clients as unknown as { name?: string };
    return {
      id: p.id,
      name: p.name,
      clientName: client?.name ?? "",
    };
  });
}

export async function listServicesForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<SlackService[]> {
  const { data } = await supabase
    .from("services")
    .select("id, name")
    .eq("user_id", userId)
    .order("name");
  return (data ?? []).map((s) => ({ id: s.id, name: s.name }));
}

export async function listTasksForProjectService(
  supabase: SupabaseClient,
  projectId: string,
  serviceId: string
): Promise<SlackTask[]> {
  const { data } = await supabase
    .from("tasks")
    .select("id, name")
    .eq("project_id", projectId)
    .eq("service_id", serviceId)
    .order("name");
  return (data ?? []).map((t) => ({ id: t.id, name: t.name }));
}

export function matchByName<T extends { name: string; clientName?: string }>(
  items: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean);
  return items
    .map((item) => {
      const hay = `${item.clientName ?? ""} ${item.name}`.toLowerCase();
      let score = 0;
      if (hay === q) score = 100;
      else if (hay.includes(q)) score = 80;
      else score = words.filter((w) => hay.includes(w)).length * 25;
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}

export function matchProjects(projects: SlackProject[], query: string): SlackProject[] {
  return matchByName(projects, query);
}

export async function getActiveTimerForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<SlackActiveTimer | null> {
  const { data } = await supabase
    .from("time_logs")
    .select("id, started_at, project_id, projects(id, name, clients(name)), tasks(name, service_id)")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.projects) return null;
  const proj = data.projects as unknown as {
    id?: string;
    name?: string;
    clients?: { name?: string };
  };
  const task = data.tasks as unknown as { name?: string; service_id?: string } | null;
  let serviceName: string | undefined;
  if (task?.service_id) {
    const { data: svc } = await supabase
      .from("services")
      .select("name")
      .eq("id", task.service_id)
      .maybeSingle();
    serviceName = svc?.name;
  }
  return {
    id: data.id,
    projectId: proj.id ?? data.project_id,
    projectName: proj.name ?? "",
    clientName: proj.clients?.name ?? "",
    taskName: task?.name,
    serviceName,
    startedAt: data.started_at,
  };
}

export async function startTimerForUser(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  options?: { taskId?: string; serviceId?: string }
): Promise<{
  error?: string;
  logId?: string;
  startedAt?: string;
  projectName?: string;
  clientName?: string;
  serviceName?: string;
  taskName?: string;
}> {
  const projects = await listActiveProjectsForUser(supabase, userId);
  const project = projects.find((p) => p.id === projectId);
  if (!project) return { error: "Project not found." };

  const { data: active } = await supabase
    .from("time_logs")
    .select("id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();

  if (active) {
    const ended = new Date();
    const started = new Date(active.started_at);
    const duration = Math.round((ended.getTime() - started.getTime()) / 60000);
    await supabase
      .from("time_logs")
      .update({ ended_at: ended.toISOString(), duration_minutes: duration })
      .eq("id", active.id);
  }

  const { data, error } = await supabase
    .from("time_logs")
    .insert({
      project_id: projectId,
      user_id: userId,
      task_id: options?.taskId || null,
      started_at: new Date().toISOString(),
      is_billable: true,
    })
    .select("id, started_at")
    .single();

  if (error) return { error: error.message };

  let taskName: string | undefined;
  let serviceName: string | undefined;
  if (options?.taskId) {
    const { data: task } = await supabase
      .from("tasks")
      .select("name, service_id")
      .eq("id", options.taskId)
      .maybeSingle();
    taskName = task?.name;
    if (task?.service_id) {
      const { data: svc } = await supabase
        .from("services")
        .select("name")
        .eq("id", task.service_id)
        .maybeSingle();
      serviceName = svc?.name;
    }
  }

  if (options?.serviceId && !serviceName) {
    const { data: svc } = await supabase
      .from("services")
      .select("name")
      .eq("id", options.serviceId)
      .maybeSingle();
    serviceName = svc?.name;
  }

  return {
    logId: data.id,
    startedAt: data.started_at,
    projectName: project.name,
    clientName: project.clientName,
    taskName,
    serviceName,
  };
}

export async function stopTimerForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  error?: string;
  minutes?: number;
  projectName?: string;
  clientName?: string;
  serviceName?: string;
  taskName?: string;
}> {
  const active = await getActiveTimerForUser(supabase, userId);
  if (!active) return { error: "No timer is running." };

  const ended = new Date();
  const started = new Date(active.startedAt);
  const duration = Math.max(1, Math.round((ended.getTime() - started.getTime()) / 60000));

  const { error } = await supabase
    .from("time_logs")
    .update({
      ended_at: ended.toISOString(),
      duration_minutes: duration,
    })
    .eq("id", active.id);

  if (error) return { error: error.message };
  return {
    minutes: duration,
    projectName: active.projectName,
    clientName: active.clientName,
    serviceName: active.serviceName,
    taskName: active.taskName,
  };
}

export function formatElapsed(startedAt: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${secs}s`;
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}
