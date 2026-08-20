import { listOrgTimesheets } from "@/app/actions/org-timesheets";
import { OrgTimesheetsContent } from "./org-timesheets-content";

export default async function OrgTimesheetsPage() {
  const pending = await listOrgTimesheets("submitted");
  const reviewed = await listOrgTimesheets();
  return <OrgTimesheetsContent pending={pending} all={reviewed} />;
}
