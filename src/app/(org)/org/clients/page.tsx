import { listOrgClients } from "@/app/actions/organizations";
import { OrgClientsContent } from "./org-clients-content";

export default async function OrgClientsPage() {
  const clients = await listOrgClients();
  return <OrgClientsContent clients={clients} />;
}
