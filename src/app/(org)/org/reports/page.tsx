import { getOrgProfitabilityReport, getOrgRetainerAlerts } from "@/app/actions/org-projects";
import { OrgReportsContent } from "./org-reports-content";

export default async function OrgReportsPage() {
  const [rows, alerts] = await Promise.all([
    getOrgProfitabilityReport(),
    getOrgRetainerAlerts(),
  ]);
  return <OrgReportsContent rows={rows} alerts={alerts} />;
}
