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
      .select("id, name, hourly_rate, billing_type, status, description, retainer_amount, retainer_hours, agreed_fee, estimated_hours, tax_rate, created_at")
      .eq("client_id", id)
      .order("name"),
    getClientInvites(id),
    getProjectEffectiveRates(id),
  ]);
  const projects = projectsRes.data ?? [];
  const effectiveRatesByProject = new Map(
    (projectRates ?? []).map((r) => [r.projectId, r])
  );

  return (
    <div className="p-6">
      <ProjectContent
        client={client}
        projects={projects}
        invites={invites}
        effectiveRatesByProject={effectiveRatesByProject}
      />
    </div>
  );
}
