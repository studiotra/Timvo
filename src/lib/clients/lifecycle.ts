import type { SupabaseClient } from "@supabase/supabase-js";

export function isArchivedClientStatus(status?: string | null): boolean {
  return status === "archived";
}

export function clientDeleteBlockedMessage(
  invoiceCount: number,
  logCount: number
): string | null {
  if (invoiceCount > 0 || logCount > 0) {
    return "This client has invoices or time logs. Archive instead.";
  }
  return null;
}

export async function countClientInvoicesAndLogs(
  supabase: SupabaseClient,
  clientId: string
): Promise<{ invoices: number; logs: number }> {
  const [{ count: invoiceCount }, { data: projects }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId),
    supabase.from("projects").select("id").eq("client_id", clientId),
  ]);
  const projectIds = (projects ?? []).map((p) => p.id);
  let logs = 0;
  if (projectIds.length) {
    const { count } = await supabase
      .from("time_logs")
      .select("id", { count: "exact", head: true })
      .in("project_id", projectIds);
    logs = count ?? 0;
  }
  return { invoices: invoiceCount ?? 0, logs };
}

/** Client ids that have at least one invoice or time log. */
export async function clientIdsWithInvoicesOrLogs(
  supabase: SupabaseClient,
  clientIds: string[]
): Promise<Set<string>> {
  const blocked = new Set<string>();
  if (clientIds.length === 0) return blocked;

  const [{ data: invoices }, { data: projects }] = await Promise.all([
    supabase.from("invoices").select("client_id").in("client_id", clientIds),
    supabase.from("projects").select("id, client_id").in("client_id", clientIds),
  ]);
  for (const row of invoices ?? []) {
    if (row.client_id) blocked.add(row.client_id);
  }
  const projectIds = (projects ?? []).map((p) => p.id);
  if (projectIds.length === 0) return blocked;

  const projectToClient = new Map(
    (projects ?? []).map((p) => [p.id, p.client_id] as const)
  );
  const { data: logs } = await supabase
    .from("time_logs")
    .select("project_id")
    .in("project_id", projectIds);
  for (const row of logs ?? []) {
    const clientId = projectToClient.get(row.project_id);
    if (clientId) blocked.add(clientId);
  }
  return blocked;
}
