import { listOrgTimesheets } from "@/app/actions/org-timesheets";
import { listOrgViewerClients } from "@/app/actions/viewer-shares";
import { OrgTimesheetsContent } from "./org-timesheets-content";
import { PublishToViewerPanel } from "./publish-to-viewer-panel";

export default async function OrgTimesheetsPage() {
  const pending = await listOrgTimesheets("submitted");
  const approved = await listOrgTimesheets("approved");
  const all = await listOrgTimesheets();
  const viewerClients = await listOrgViewerClients();

  return (
    <>
      <PublishToViewerPanel approved={approved} viewerClients={viewerClients} />
      <OrgTimesheetsContent pending={pending} all={all} />
    </>
  );
}
