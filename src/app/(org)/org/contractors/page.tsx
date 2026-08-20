import { listOrgContractors } from "@/app/actions/organizations";
import { OrgContractorsContent } from "./org-contractors-content";

export default async function OrgContractorsPage() {
  const contractors = await listOrgContractors();
  return <OrgContractorsContent contractors={contractors} />;
}
