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
    .select("id, name, hourly_rate, billing_type, status, client_id, description, retainer_amount, retainer_hours, agreed_fee, estimated_hours")
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

  return (
    <div className="p-6">
      <ProjectDetailContent
        client={client}
        project={project}
        tasks={(tasks ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          serviceId: t.service_id ?? null,
          serviceName: t.service_id ? servicesMap[t.service_id] ?? null : null,
        }))}
      />
    </div>
  );
}
