import { getTimeLogs } from "@/app/actions/time-logs";
import { getClientsForSelect } from "@/app/actions/clients-projects";
import { getContractorOrganizations } from "@/app/actions/organizations";
import { getLogShareStatuses } from "@/app/actions/org-timesheets";
import {
  parseLogsDisplayMode,
  parseLogsMapGroup,
  parseLogsViewMode,
} from "@/lib/logs/search-params";
import { LogsContent } from "./logs-content";

type SearchParams = {
  view?: string;
  offset?: string;
  display?: string;
  group?: string;
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
  const displayMode = parseLogsDisplayMode(params.display);
  const view = parseLogsViewMode(params.view);
  const offset = parseInt(params.offset || "0", 10);
  const mapGroup = parseLogsMapGroup(params.group);
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
    <LogsContent
      logs={logs}
      clients={clients}
      organizations={organizations}
      shareStatuses={shareStatuses}
      displayMode={displayMode}
      view={view}
      offset={offset}
      mapGroup={mapGroup}
      initialFilters={{
        clientId: params.client ?? "",
        fromDate: params.from ?? "",
        toDate: params.to ?? "",
      }}
    />
  );
}
