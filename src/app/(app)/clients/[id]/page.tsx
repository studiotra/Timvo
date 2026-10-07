import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProjectContent } from "./project-content";
import { getProjectEffectiveRates } from "@/app/actions/effective-rates";
import { getContractorOrganizations } from "@/app/actions/organizations";
import { getProjectSharesForProjects } from "@/app/actions/project-shares";
import { getClientBillingSummary } from "@/app/actions/client-summary";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, name, email, tax_id, currency, status, address, phone_number, business_phone, extension, note"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!client) {
    notFound();
  }

  const [projectsRes, projectRates, organizations, summary] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, hourly_rate, billing_type, status, description, retainer_amount, retainer_hours, agreed_fee, estimated_hours, tax_rate, created_at"
      )
      .eq("client_id", id)
      .order("name"),
    getProjectEffectiveRates(id),
    getContractorOrganizations(),
    getClientBillingSummary(id),
  ]);
  const projects = projectsRes.data ?? [];
  const effectiveRatesByProject = new Map(
    (projectRates ?? []).map((r) => [r.projectId, r])
  );
  const sharesByProject = await getProjectSharesForProjects(
    projects.map((p) => p.id)
  );

  return (
    <div className="p-6">
      <ProjectContent
        client={client}
        projects={projects}
        organizations={organizations}
        sharesByProject={sharesByProject}
        effectiveRatesByProject={effectiveRatesByProject}
        summary={summary}
      />
    </div>
  );
}
