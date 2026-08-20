import { Suspense } from "react";
import { getTimeLogs } from "@/app/actions/time-logs";
import { getClientsForSelect } from "@/app/actions/clients-projects";
import { getContractorOrganizations } from "@/app/actions/organizations";
import { getLogShareStatuses } from "@/app/actions/org-timesheets";
import { LogsContent } from "./logs-content";

type SearchParams = {
  view?: string;
  offset?: string;
  display?: string;
  client?: string;
  from?: string;
  to?: string;
};

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const displayMode =
    params.display === "calendar" || params.display === "map" ? params.display : "list";
  const view = displayMode === "calendar" ? "week" : ((params.view || "week") as "week" | "month");
  const offset = parseInt(params.offset || "0", 10);
  const filters = {
    clientId: params.client || undefined,
    fromDate: params.from || undefined,
    toDate: params.to || undefined,
  };

  const [logs, clients, organizations] = await Promise.all([
    getTimeLogs(view, offset, Object.values(filters).some(Boolean) ? filters : undefined),
    getClientsForSelect(),
    getContractorOrganizations(),
  ]);

  const shareStatuses = await getLogShareStatuses(logs.map((l) => l.id));

  return (
    <Suspense fallback={<div className="text-[var(--text-muted)]">Loading logs…</div>}>
      <LogsContent
        logs={logs}
        clients={clients}
        organizations={organizations}
        shareStatuses={shareStatuses}
        displayMode={displayMode}
        initialFilters={{
          clientId: params.client ?? "",
          fromDate: params.from ?? "",
          toDate: params.to ?? "",
        }}
      />
    </Suspense>
  );
}
