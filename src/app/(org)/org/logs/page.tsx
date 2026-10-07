import { getOrgClientsForSelect, getOrgTimeLogs } from "@/app/actions/org-tracking";
import {
  parseLogsDisplayMode,
  parseLogsMapGroup,
  parseLogsViewMode,
} from "@/lib/logs/search-params";
import { LogsContent } from "@/app/(app)/logs/logs-content";

type SearchParams = {
  view?: string;
  offset?: string;
  display?: string;
  group?: string;
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
  const displayMode = parseLogsDisplayMode(params.display);
  const view = parseLogsViewMode(params.view);
  const offset = parseInt(params.offset || "0", 10);
  const mapGroup = parseLogsMapGroup(params.group);
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
    <LogsContent
      logs={logs}
      clients={clients}
      displayMode={displayMode}
      view={view}
      offset={offset}
      mapGroup={mapGroup}
      basePath="/org/logs"
      initialFilters={{
        clientId: params.client ?? "",
        fromDate: params.from ?? "",
        toDate: params.to ?? "",
      }}
    />
  );
}
