"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  endOfLocalDay,
  formatInstantAsLocalDate,
  formatInstantAsLocalTime,
  getMonthRange,
  getWeekRange,
  localToday,
  resolveLogSchedule,
  startOfLocalDay,
  zonedDateTimeToUtc,
} from "@/lib/dates";
import { resolveServiceTask } from "@/lib/time-logs/service-task";
import { fetchUserTimezone } from "@/lib/user-timezone";

/** Invalidate log list routes only — avoid layout-wide `/` refresh after every save. */
function revalidateTimeLogPaths() {
  revalidatePath("/logs");
  revalidatePath("/org/logs");
}

export type TimeLogRow = {
  id: string;
  project_id: string;
  client_id: string;
  client_name: string;
  project_name: string;
  task_id: string | null;
  task_name: string | null;
  service_id: string | null;
  service_name: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  description: string | null;
  is_billable: boolean;
  is_billed: boolean;
};

/**
 * Attach service to a log via task_id (no time_logs.service_id column).
 * Reuses or creates a project task for the selected service when no task is set.
 */
async function resolveTaskIdForService(
  supabase: SupabaseClient,
  projectId: string,
  serviceId: string | null | undefined,
  taskId: string | null | undefined
): Promise<{ taskId: string | null; error?: string }> {
  const explicitTaskId = taskId?.trim() || null;
  if (explicitTaskId) return { taskId: explicitTaskId };

  const sid = serviceId?.trim() || null;
  if (!sid) return { taskId: null };

  const { data: service } = await supabase
    .from("services")
    .select("name")
    .eq("id", sid)
    .maybeSingle();

  const { data: candidates } = await supabase
    .from("tasks")
    .select("id, name")
    .eq("project_id", projectId)
    .eq("service_id", sid)
    .order("created_at", { ascending: true });

  const decision = resolveServiceTask({
    taskId: null,
    serviceId: sid,
    serviceName: service?.name ?? null,
    candidates: (candidates ?? []).map((t) => ({ id: t.id, name: t.name })),
  });

  if (decision.kind === "task") return { taskId: decision.taskId };
  if (decision.kind === "none") return { taskId: null };

  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      service_id: sid,
      name: decision.name,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { taskId: null, error: error?.message ?? "Could not save service for this log." };
  }
  return { taskId: created.id };
}

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

  const timezone = await fetchUserTimezone(supabase, user.id);
  let from: Date;
  let to: Date;

  if (filters?.fromDate && filters?.toDate) {
    from = startOfLocalDay(filters.fromDate, timezone);
    to = endOfLocalDay(filters.toDate, timezone);
  } else if (view === "week") {
    const range = getWeekRange(timezone, offsetWeeks);
    from = range.from;
    to = range.to;
  } else {
    const range = getMonthRange(timezone, offsetWeeks);
    from = range.from;
    to = range.to;
  }

  const fromStr = from.toISOString();
  const toStr = to.toISOString();

  let query = supabase
    .from("time_logs")
    .select(`
      id, project_id, task_id, started_at, ended_at, duration_minutes,
      description, is_billable, is_billed,
      projects(id, name, client_id, clients(id, name)),
      tasks(id, name, service_id)
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

  const serviceIds = [
    ...new Set(
      data
        .map((r) => {
          const task = r.tasks as unknown as { service_id?: string | null } | null;
          return task?.service_id ?? null;
        })
        .filter(Boolean)
    ),
  ] as string[];
  const serviceNameMap: Record<string, string> = {};
  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from("services")
      .select("id, name")
      .in("id", serviceIds);
    for (const s of services ?? []) {
      serviceNameMap[s.id] = s.name;
    }
  }

  return data
    .filter((r) => r.projects && typeof (r.projects as unknown as { client_id?: string }).client_id === "string")
    .map((r) => {
      const p = r.projects as unknown as { id: string; name: string; client_id: string; clients?: { id: string; name: string } };
      const task = r.tasks as unknown as {
        id: string;
        name: string;
        service_id: string | null;
      } | null;
      const serviceId = task?.service_id ?? null;
      return {
        id: r.id,
        project_id: r.project_id,
        client_id: p.client_id,
        client_name: p.clients?.name ?? "—",
        project_name: p.name ?? "—",
        task_id: r.task_id ?? task?.id ?? null,
        task_name: task?.name ?? null,
        service_id: serviceId,
        service_name: serviceId ? serviceNameMap[serviceId] ?? null : null,
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
  revalidateTimeLogPaths();
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
  revalidateTimeLogPaths();
  return { success: true };
}

export async function addManualLog(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const projectId = formData.get("project_id") as string;
  const taskId = (formData.get("task_id") as string) || null;
  const serviceId = (formData.get("service_id") as string) || null;
  const date = formData.get("date") as string;
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  const durationParam = formData.get("duration") as string | null;
  const description = (formData.get("description") as string)?.trim() || null;
  const isBillable = formData.get("is_billable") === "true";

  if (!projectId || !date)
    return { error: "Project and date are required" };

  const timezone = await fetchUserTimezone(supabase, user.id);
  let startedAt: Date;
  let endedAt: Date;
  let durationMinutes: number;

  if (startTime && endTime) {
    const schedule = resolveLogSchedule(date, startTime, endTime, timezone);
    if (!schedule.ok) return { error: schedule.error };
    startedAt = schedule.startedAt;
    endedAt = schedule.endedAt;
    durationMinutes = schedule.durationMinutes;
  } else if (durationParam) {
    const duration = parseInt(durationParam, 10);
    if (isNaN(duration) || duration <= 0)
      return { error: "Project, date, and duration are required" };
    startedAt = zonedDateTimeToUtc(date, "09:00", timezone);
    endedAt = new Date(startedAt.getTime() + duration * 60 * 1000);
    durationMinutes = duration;
  } else {
    return { error: "Project, date, and time range are required" };
  }

  const resolvedTask = await resolveTaskIdForService(
    supabase,
    projectId,
    serviceId,
    taskId
  );
  if (resolvedTask.error) return { error: resolvedTask.error };

  const { error } = await supabase.from("time_logs").insert({
    project_id: projectId,
    user_id: user.id,
    task_id: resolvedTask.taskId,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_minutes: durationMinutes,
    description,
    is_billable: isBillable,
  });

  if (error) return { error: error.message };
  revalidateTimeLogPaths();
  return { success: true };
}

/** Create a time log for a specific task (used when adding task with optional time entry). */
export async function addTimeLogForTask(
  projectId: string,
  taskId: string,
  data: {
    date: string;
    durationMinutes: number;
    description?: string | null;
    isBillable?: boolean;
    startTime?: string;
    endTime?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  if (!projectId || !taskId || !data.date || data.durationMinutes <= 0)
    return { error: "Project, task, date, and duration required" };

  const timezone = await fetchUserTimezone(supabase, user.id);
  let startedAt: Date;
  let endedAt: Date;

  if (data.startTime && data.endTime) {
    const schedule = resolveLogSchedule(data.date, data.startTime, data.endTime, timezone);
    if (!schedule.ok) return { error: schedule.error };
    startedAt = schedule.startedAt;
    endedAt = schedule.endedAt;
  } else {
    startedAt = zonedDateTimeToUtc(data.date, "09:00", timezone);
    endedAt = new Date(startedAt.getTime() + data.durationMinutes * 60 * 1000);
  }

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
  revalidateTimeLogPaths();
  return { success: true };
}

export async function updateTimeLog(
  id: string,
  data: {
    project_id?: string;
    task_id?: string | null;
    service_id?: string | null;
    description?: string;
    is_billable?: boolean;
    date?: string;
    start_time?: string;
    end_time?: string;
    duration_minutes?: number;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("time_logs")
    .select("project_id, started_at, ended_at, duration_minutes")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existing) return { error: "Time log not found" };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.project_id !== undefined) update.project_id = data.project_id;
  if (data.description !== undefined) update.description = data.description;
  if (data.is_billable !== undefined) update.is_billable = data.is_billable;

  const touchesTaskOrService =
    data.task_id !== undefined || data.service_id !== undefined;
  if (touchesTaskOrService) {
    const projectId = data.project_id ?? existing.project_id;
    const resolvedTask = await resolveTaskIdForService(
      supabase,
      projectId,
      data.service_id,
      data.task_id
    );
    if (resolvedTask.error) return { error: resolvedTask.error };
    update.task_id = resolvedTask.taskId;
  }

  const touchesSchedule =
    data.date !== undefined ||
    data.start_time !== undefined ||
    data.end_time !== undefined ||
    data.duration_minutes !== undefined;

  if (touchesSchedule) {
    const timezone = await fetchUserTimezone(supabase, user.id);
    const dateStr =
      data.date ??
      (existing.started_at
        ? formatInstantAsLocalDate(existing.started_at, timezone)
        : localToday(timezone));

    let startedAt: Date;
    let endedAt: Date;
    let mins: number;

    if (data.start_time && data.end_time) {
      const schedule = resolveLogSchedule(dateStr, data.start_time, data.end_time, timezone);
      if (!schedule.ok) return { error: schedule.error };
      startedAt = schedule.startedAt;
      endedAt = schedule.endedAt;
      mins = schedule.durationMinutes;
    } else {
      const startTime =
        data.start_time ??
        (existing.started_at
          ? formatInstantAsLocalTime(existing.started_at, timezone)
          : "09:00");
      startedAt = zonedDateTimeToUtc(dateStr, startTime, timezone);
      mins = data.duration_minutes ?? existing.duration_minutes ?? 0;
      endedAt = new Date(startedAt.getTime() + mins * 60 * 1000);
    }

    update.started_at = startedAt.toISOString();
    update.ended_at = endedAt.toISOString();
    update.duration_minutes = mins;
  }

  const { error } = await supabase
    .from("time_logs")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateTimeLogPaths();
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
  revalidateTimeLogPaths();
  return { success: true };
}
