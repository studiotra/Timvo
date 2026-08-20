import { notFound } from "next/navigation";
import { getOrgClient, listOrgProjects } from "@/app/actions/org-projects";
import { OrgClientDetailContent } from "./org-client-detail-content";

export default async function OrgClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getOrgClient(id);
  if (!client) notFound();
  const projects = await listOrgProjects(id);

  return (
    <OrgClientDetailContent
      clientId={client.id}
      clientName={client.name}
      clientEmail={client.email}
      projects={projects}
    />
  );
}
