export type LogsDisplayMode = "list" | "calendar" | "map";
export type LogsViewMode = "week" | "month";
export type LogsMapGroup = "all" | "client" | "project";

export type LogsUrlState = {
  displayMode: LogsDisplayMode;
  view: LogsViewMode;
  offset: number;
  mapGroup: LogsMapGroup;
  clientId?: string;
  fromDate?: string;
  toDate?: string;
};

/**
 * Build /logs (or /org/logs) query string from UI state.
 * Avoids useSearchParams so soft navigation does not need a Suspense CSR bailout.
 * Default values (list / week / 0 / all) are omitted from the query string.
 */
export function buildLogsSearchParams(
  state: LogsUrlState,
  updates: Record<string, string> = {}
): string {
  const params = new URLSearchParams();

  const display = updates.display ?? state.displayMode;
  const view = updates.view ?? state.view;
  const offset =
    updates.offset !== undefined ? updates.offset : String(state.offset);
  const group = updates.group ?? state.mapGroup;
  const client = updates.client !== undefined ? updates.client : state.clientId ?? "";
  const from = updates.from !== undefined ? updates.from : state.fromDate ?? "";
  const to = updates.to !== undefined ? updates.to : state.toDate ?? "";

  const values: Record<string, string> = {
    display: display === "list" ? "" : display,
    view: view === "week" || view === "" ? "" : view,
    offset: offset === "0" || offset === "" ? "" : offset,
    group: group === "all" || group === "" ? "" : group,
    client,
    from,
    to,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }

  return params.toString();
}

export function parseLogsDisplayMode(value: string | undefined | null): LogsDisplayMode {
  return value === "calendar" || value === "map" ? value : "list";
}

export function parseLogsMapGroup(value: string | undefined | null): LogsMapGroup {
  return value === "client" || value === "project" ? value : "all";
}

/** Week/month for list and calendar (calendar month view is supported). */
export function parseLogsViewMode(value: string | undefined | null): LogsViewMode {
  return value === "month" ? "month" : "week";
}
