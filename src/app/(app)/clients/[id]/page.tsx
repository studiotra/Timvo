import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProjectContent } from "./project-content";
import { getClientInvites } from "@/app/actions/client-invites";
import { getProjectEffectiveRates } from "@/app/actions/effective-rates";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email, tax_id, currency, address, phone_number, business_phone, extension, note")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!client) {
    notFound();
  }

  const [projectsRes, invites, projectRates] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, hourly_rate, billing_type, status, description, retainer_amount, retainer_hours, agreed_fee, estimated_hours, tax_rate")
      .eq("client_id", id)
      .order("name"),
    getClientInvites(id),
    getProjectEffectiveRates(id),
  ]);
  const projects = projectsRes.data ?? [];
  const effectiveRatesByProject = new Map(
    (projectRates ?? []).map((r) => [r.projectId, r])
  );

  const projectIds = projects.map((p) => p.id);
  const tasksByProject: Record<string, { id: string; name: string; serviceId?: string | null; serviceName?: string | null }[]> = {};
  for (const p of projects) {
    tasksByProject[p.id] = [];
  }
  if (projectIds.length > 0) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, name, project_id, service_id")
      .in("project_id", projectIds)
      .order("name");
    const serviceIds = [...new Set((tasks ?? []).map((t) => t.service_id).filter(Boolean))] as string[];
    const servicesMap: Record<string, string> = {};
    if (serviceIds.length > 0) {
      const { data: svc } = await supabase.from("services").select("id, name").in("id", serviceIds);
      for (const s of svc ?? []) servicesMap[s.id] = s.name;
    }
    for (const t of tasks ?? []) {
      const arr = tasksByProject[t.project_id];
      if (arr) arr.push({
        id: t.id,
        name: t.name,
        serviceId: t.service_id ?? null,
        serviceName: t.service_id ? servicesMap[t.service_id] ?? null : null,
      });
    }
  }

  return (
    <div className="p-6">
      <ProjectContent
        client={client}
        projects={projects}
        tasksByProject={tasksByProject}
        invites={invites}
        effectiveRatesByProject={effectiveRatesByProject}
      />
    </div>
  );
}
