import { getOrgContext, listOrgClients } from "@/app/actions/organizations";
import { OrgClientsContent } from "./org-clients-content";

export default async function OrgClientsPage() {
  const ctx = await getOrgContext();
  const clients = await listOrgClients({ includeArchived: true });
  return <OrgClientsContent clients={clients} role={ctx?.role ?? "viewer"} />;
}
