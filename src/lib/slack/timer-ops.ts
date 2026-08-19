import type { SupabaseClient } from "@supabase/supabase-js";

export type SlackProject = {
  id: string;
  name: string;
  clientName: string;
};

export type SlackActiveTimer = {
  id: string;
  projectName: string;
  clientName: string;
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

export function matchProjects(projects: SlackProject[], query: string): SlackProject[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const words = q.split(/\s+/).filter(Boolean);
  const scored = projects
    .map((p) => {
      const hay = `${p.clientName} ${p.name}`.toLowerCase();
      let score = 0;
      if (hay === q) score = 100;
      else if (hay.includes(q)) score = 80;
      else score = words.filter((w) => hay.includes(w)).length * 25;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((x) => x.p);
}

export async function getActiveTimerForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<SlackActiveTimer | null> {
  const { data } = await supabase
    .from("time_logs")
    .select("id, started_at, projects(id, name, clients(name))")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.projects) return null;
  const proj = data.projects as unknown as {
    name?: string;
    clients?: { name?: string };
  };
  return {
    id: data.id,
    projectName: proj.name ?? "",
    clientName: proj.clients?.name ?? "",
    startedAt: data.started_at,
  };
}

export async function startTimerForUser(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{ error?: string; startedAt?: string; projectName?: string; clientName?: string }> {
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
      started_at: new Date().toISOString(),
      is_billable: true,
    })
    .select("id, started_at")
    .single();

  if (error) return { error: error.message };
  return {
    startedAt: data.started_at,
    projectName: project.name,
    clientName: project.clientName,
  };
}

export async function stopTimerForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error?: string; minutes?: number; projectName?: string; clientName?: string }> {
  const { data: active } = await supabase
    .from("time_logs")
    .select("id, started_at, projects(name, clients(name))")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();

  if (!active) return { error: "No timer is running." };

  const ended = new Date();
  const started = new Date(active.started_at);
  const duration = Math.max(1, Math.round((ended.getTime() - started.getTime()) / 60000));

  const { error } = await supabase
    .from("time_logs")
    .update({
      ended_at: ended.toISOString(),
      duration_minutes: duration,
    })
    .eq("id", active.id);

  if (error) return { error: error.message };

  const proj = active.projects as unknown as {
    name?: string;
    clients?: { name?: string };
  };
  return {
    minutes: duration,
    projectName: proj?.name ?? "",
    clientName: proj?.clients?.name ?? "",
  };
}

export function formatElapsed(startedAt: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}
