import { getOrgAssignmentBoard } from "@/app/actions/project-shares";
import { OrgAssignmentsBoard } from "./org-assignments-board";

export default async function OrgAssignmentsPage() {
  const data = await getOrgAssignmentBoard();
  return <OrgAssignmentsBoard data={data} />;
}
