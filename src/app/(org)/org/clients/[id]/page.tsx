import { notFound } from "next/navigation";
import { getOrgContext } from "@/app/actions/organizations";
import { getOrgClient, listOrgProjects } from "@/app/actions/org-projects";
import { OrgClientDetailContent } from "./org-client-detail-content";

export default async function OrgClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ctx, client] = await Promise.all([getOrgContext(), getOrgClient(id)]);
  if (!client) notFound();
  const projects = await listOrgProjects(id);

  return (
    <OrgClientDetailContent
      client={client}
      role={ctx?.role ?? "viewer"}
      projects={projects}
    />
  );
}
