import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProjectDetailContent } from "./project-detail-content";
import { sortTaskRows } from "@/lib/tasks/fields";
import {
  groupLogsByTaskCategory,
  type ProjectLog,
} from "@/lib/time-logs/task-groups";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id: clientId, projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, hourly_rate, billing_type, status, client_id, description, retainer_amount, retainer_hours, agreed_fee, estimated_hours, tax_rate")
    .eq("id", projectId)
    .eq("client_id", clientId)
    .single();

  if (!project) {
    notFound();
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email, tax_id, currency")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();

  if (!client) {
    notFound();
  }

  let taskFeatures = { extras: true };
  let tasks:
    | Array<{
        id: string;
        name: string;
        service_id: string | null;
        is_done?: boolean | null;
        due_date?: string | null;
        sort_order?: number | null;
      }>
    | null = null;

  const withExtras = await supabase
    .from("tasks")
    .select("id, name, service_id, is_done, due_date, sort_order")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("name");

  if (withExtras.error) {
    taskFeatures = { extras: false };
    const { data } = await supabase
      .from("tasks")
      .select("id, name, service_id")
      .eq("project_id", projectId)
      .order("name");
    tasks = data ?? [];
  } else {
    tasks = withExtras.data ?? [];
  }

  const serviceIds = [...new Set((tasks ?? []).map((t) => t.service_id).filter(Boolean))] as string[];
  const servicesMap: Record<string, string> = {};
  if (serviceIds.length > 0) {
    const { data: svc } = await supabase.from("services").select("id, name").in("id", serviceIds);
    for (const s of svc ?? []) servicesMap[s.id] = s.name;
  }

  const { data: timeLogs } = await supabase
    .from("time_logs")
    .select(
      "id, duration_minutes, task_id, description, started_at, ended_at, is_billable, is_billed, task:task_id(id, name, service_id)"
    )
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  const mappedLogs: ProjectLog[] = (timeLogs ?? []).map((log) => {
    const task = log.task as { id?: string; name?: string; service_id?: string } | null;
    return {
      id: log.id,
      task_id: log.task_id ?? task?.id ?? null,
      task_name: task?.name ?? null,
      service_id: task?.service_id ?? null,
      service_name: task?.service_id ? servicesMap[task.service_id] ?? null : null,
      description: log.description ?? null,
      duration_minutes: log.duration_minutes ?? 0,
      started_at: log.started_at,
      ended_at: log.ended_at ?? null,
      is_billable: log.is_billable ?? true,
      is_billed: log.is_billed ?? false,
    };
  });

  const totalMinutes = mappedLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);

  const taskNames: Record<string, string> = {};
  for (const t of tasks ?? []) taskNames[t.id] = t.name;
  for (const log of mappedLogs) {
    if (log.task_id && log.task_name) taskNames[log.task_id] = log.task_name;
  }
  const groups = groupLogsByTaskCategory(mappedLogs, taskNames);
  const groupByTaskId = new Map(
    groups.filter((g) => g.taskId).map((g) => [g.taskId as string, g])
  );

  const mergedTasks: {
    id: string | null;
    name: string;
    serviceId: string | null;
    serviceName: string | null;
    totalMinutes: number;
    isDone: boolean;
    dueDate: string | null;
    sortOrder: number;
    logs: ProjectLog[];
  }[] = [];

  for (const t of tasks ?? []) {
    const group = groupByTaskId.get(t.id);
    mergedTasks.push({
      id: t.id,
      name: t.name,
      serviceId: t.service_id ?? null,
      serviceName: t.service_id ? servicesMap[t.service_id] ?? null : null,
      totalMinutes: group?.totalMinutes ?? 0,
      isDone: !!t.is_done,
      dueDate: t.due_date ?? null,
      sortOrder: t.sort_order ?? 0,
      logs: group?.logs ?? [],
    });
  }

  for (const group of groups.filter((g) => g.taskId == null)) {
    mergedTasks.push({
      id: null,
      name: group.name,
      serviceId: null,
      serviceName: null,
      totalMinutes: group.totalMinutes,
      isDone: false,
      dueDate: null,
      sortOrder: Number.MAX_SAFE_INTEGER,
      logs: group.logs,
    });
  }

  const sorted = sortTaskRows(mergedTasks);

  return (
    <div className="p-6">
      <ProjectDetailContent
        client={client}
        project={project}
        tasks={sorted}
        totalMinutes={totalMinutes}
        taskFeatures={taskFeatures}
      />
    </div>
  );
}
