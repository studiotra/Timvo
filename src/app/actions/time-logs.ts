"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TimeLogRow = {
  id: string;
  project_id: string;
  client_id: string;
  client_name: string;
  project_name: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  description: string | null;
  is_billable: boolean;
  is_billed: boolean;
};

export type GetTimeLogsFilters = {
  clientId?: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
};

export async function getTimeLogs(
  view: "week" | "month",
  offsetWeeks = 0,
  filters?: GetTimeLogsFilters
): Promise<TimeLogRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();
  let from: Date;
  let to: Date;

  if (filters?.fromDate && filters?.toDate) {
    from = new Date(filters.fromDate + "T00:00:00");
    to = new Date(filters.toDate + "T23:59:59");
  } else if (view === "week") {
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() + offsetWeeks * 7);
    from = monday;
    to = new Date(monday);
    to.setDate(to.getDate() + 6);
    to.setHours(23, 59, 59, 999);
  } else {
    from = new Date(now.getFullYear(), now.getMonth() + offsetWeeks, 1);
    to = new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const fromStr = from.toISOString();
  const toStr = to.toISOString();

  let query = supabase
    .from("time_logs")
    .select(`
      id, project_id, started_at, ended_at, duration_minutes,
      description, is_billable, is_billed,
      projects(id, name, client_id, clients(id, name))
    `)
    .eq("user_id", user.id)
    .gte("started_at", fromStr)
    .lte("started_at", toStr)
    .order("started_at", { ascending: false });

  if (filters?.clientId) {
    const { data: projIds } = await supabase
      .from("projects")
      .select("id")
      .eq("client_id", filters.clientId);
    const ids = (projIds ?? []).map((p) => p.id);
    if (ids.length > 0) {
      query = query.in("project_id", ids);
    } else {
      return []; // no projects for this client
    }
  }

  const { data } = await query;

  if (!data) return [];
  return data
    .filter((r) => r.projects && typeof (r.projects as unknown as { client_id?: string }).client_id === "string")
    .map((r) => {
      const p = r.projects as unknown as { id: string; name: string; client_id: string; clients?: { id: string; name: string } };
      return {
        id: r.id,
        project_id: r.project_id,
        client_id: p.client_id,
        client_name: p.clients?.name ?? "—",
        project_name: p.name ?? "—",
        started_at: r.started_at,
        ended_at: r.ended_at,
        duration_minutes: r.duration_minutes ?? 0,
        description: r.description,
        is_billable: r.is_billable ?? true,
        is_billed: r.is_billed ?? false,
      };
    });
}

export async function startTimer(projectId: string, options?: { taskId?: string; description?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Stop any existing active timer
  const { data: active } = await supabase
    .from("time_logs")
    .select("id, started_at")
    .eq("user_id", user.id)
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
      user_id: user.id,
      task_id: options?.taskId || null,
      started_at: new Date().toISOString(),
      description: options?.description?.trim() || null,
      is_billable: true,
    })
    .select("id, started_at")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/clients");
  return { success: true, logId: data.id, startedAt: data.started_at };
}

export async function stopTimer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: active } = await supabase
    .from("time_logs")
    .select("id, started_at")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .maybeSingle();

  if (!active) return { error: "No active timer" };

  const ended = new Date();
  const started = new Date(active.started_at);
  const duration = Math.round((ended.getTime() - started.getTime()) / 60000);

  const { error } = await supabase
    .from("time_logs")
    .update({
      ended_at: ended.toISOString(),
      duration_minutes: duration,
    })
    .eq("id", active.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/clients");
  return { success: true };
}

export async function addManualLog(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const projectId = formData.get("project_id") as string;
  const taskId = (formData.get("task_id") as string) || null;
  const date = formData.get("date") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const durationParam = formData.get("duration") as string | null;
  const description = (formData.get("description") as string)?.trim() || null;
  const isBillable = formData.get("is_billable") === "true";

  let startedAt: Date;
  let endedAt: Date;
  let durationMinutes: number;

  if (startTime && endTime) {
    startedAt = new Date(`${date}T${startTime}`);
    endedAt = new Date(`${date}T${endTime}`);
    durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
    if (durationMinutes <= 0) return { error: "End time must be after start time" };
  } else if (durationParam) {
    const duration = parseInt(durationParam, 10);
    if (!date || isNaN(duration) || duration <= 0)
      return { error: "Project, date, and duration are required" };
    const d = new Date(date);
    startedAt = new Date(d);
    endedAt = new Date(d.getTime() + duration * 60 * 1000);
    durationMinutes = duration;
  } else {
    return { error: "Project, date, and time range are required" };
  }

  if (!projectId || !date)
    return { error: "Project and date are required" };

  const { error } = await supabase.from("time_logs").insert({
    project_id: projectId,
    user_id: user.id,
    task_id: taskId || null,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_minutes: durationMinutes,
    description,
    is_billable: isBillable,
  });

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/clients");
  return { success: true };
}

/** Create a time log for a specific task (used when adding task with optional time entry). */
export async function addTimeLogForTask(
  projectId: string,
  taskId: string,
  data: { date: string; durationMinutes: number; description?: string | null; isBillable?: boolean }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!projectId || !taskId || !data.date || data.durationMinutes <= 0)
    return { error: "Project, task, date, and duration required" };

  const d = new Date(data.date);
  const startedAt = new Date(d);
  const endedAt = new Date(d.getTime() + data.durationMinutes * 60 * 1000);

  const { error } = await supabase.from("time_logs").insert({
    project_id: projectId,
    user_id: user.id,
    task_id: taskId,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_minutes: data.durationMinutes,
    description: data.description?.trim() || null,
    is_billable: data.isBillable ?? true,
  });

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath("/logs");
  return { success: true };
}

export async function updateTimeLog(
  id: string,
  data: {
    project_id?: string;
    description?: string;
    is_billable?: boolean;
    date?: string;
    duration_minutes?: number;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.project_id !== undefined) update.project_id = data.project_id;
  if (data.description !== undefined) update.description = data.description;
  if (data.is_billable !== undefined) update.is_billable = data.is_billable;
  if (data.duration_minutes !== undefined) update.duration_minutes = data.duration_minutes;

  if (data.date !== undefined || data.duration_minutes !== undefined) {
    const { data: existing } = await supabase
      .from("time_logs")
      .select("started_at, duration_minutes")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    const dateStr = data.date ?? (existing?.started_at ? new Date(existing.started_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    const mins = data.duration_minutes ?? existing?.duration_minutes ?? 0;
    const start = new Date(dateStr);
    update.started_at = start.toISOString();
    update.ended_at = new Date(start.getTime() + mins * 60 * 1000).toISOString();
    update.duration_minutes = mins;
  }

  const { error } = await supabase
    .from("time_logs")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/logs");
  return { success: true };
}

export async function deleteTimeLog(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("time_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/logs");
  return { success: true };
}
