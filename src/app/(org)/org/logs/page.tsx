import { Suspense } from "react";
import { getOrgClientsForSelect, getOrgTimeLogs } from "@/app/actions/org-tracking";
import { LogsContent } from "@/app/(app)/logs/logs-content";

type SearchParams = {
  view?: string;
  offset?: string;
  display?: string;
  client?: string;
  from?: string;
  to?: string;
};

export default async function OrgLogsPage({
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

  const [logs, clients] = await Promise.all([
    getOrgTimeLogs(view, offset, Object.values(filters).some(Boolean) ? filters : undefined),
    getOrgClientsForSelect(),
  ]);

  return (
    <Suspense fallback={<div className="text-[var(--text-muted)]">Loading logs…</div>}>
      <LogsContent
        logs={logs}
        clients={clients}
        displayMode={displayMode}
        basePath="/org/logs"
        initialFilters={{
          clientId: params.client ?? "",
          fromDate: params.from ?? "",
          toDate: params.to ?? "",
        }}
      />
    </Suspense>
  );
}
