import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProjectDetailContent } from "./project-detail-content";

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

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, name, service_id")
    .eq("project_id", projectId)
    .order("name");

  const serviceIds = [...new Set((tasks ?? []).map((t) => t.service_id).filter(Boolean))] as string[];
  const servicesMap: Record<string, string> = {};
  if (serviceIds.length > 0) {
    const { data: svc } = await supabase.from("services").select("id, name").in("id", serviceIds);
    for (const s of svc ?? []) servicesMap[s.id] = s.name;
  }

  const { data: timeLogs } = await supabase
    .from("time_logs")
    .select("duration_minutes, task_id, description, task:task_id(id, name, service_id)")
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  const totalMinutes = (timeLogs ?? []).reduce((s, l) => s + (l.duration_minutes ?? 0), 0);

  const byTaskId = new Map<string, { name: string; serviceId: string | null; minutes: number }>();
  const byDescription = new Map<string, number>();
  for (const log of timeLogs ?? []) {
    const task = log.task as { id?: string; name?: string; service_id?: string } | null;
    const mins = log.duration_minutes ?? 0;
    if (task?.id) {
      const existing = byTaskId.get(task.id);
      if (existing) {
        existing.minutes += mins;
      } else {
        byTaskId.set(task.id, {
          name: task.name ?? "Task",
          serviceId: task.service_id ?? null,
          minutes: mins,
        });
      }
    } else {
      const desc = log.description?.trim() || "Uncategorized";
      byDescription.set(desc, (byDescription.get(desc) ?? 0) + mins);
    }
  }

  const mergedTasks: { id: string | null; name: string; serviceId: string | null; serviceName: string | null; totalMinutes: number }[] = [];

  for (const t of tasks ?? []) {
    const agg = byTaskId.get(t.id);
    mergedTasks.push({
      id: t.id,
      name: t.name,
      serviceId: t.service_id ?? null,
      serviceName: t.service_id ? servicesMap[t.service_id] ?? null : null,
      totalMinutes: agg?.minutes ?? 0,
    });
  }

  for (const [desc, mins] of byDescription) {
    mergedTasks.push({
      id: null,
      name: desc,
      serviceId: null,
      serviceName: null,
      totalMinutes: mins,
    });
  }

  mergedTasks.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-6">
      <ProjectDetailContent
        client={client}
        project={project}
        tasks={mergedTasks}
        totalMinutes={totalMinutes}
      />
    </div>
  );
}
