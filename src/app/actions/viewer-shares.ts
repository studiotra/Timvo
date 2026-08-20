"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/app/actions/organizations";
import { revalidatePath } from "next/cache";

export type ViewerClientOption = { id: string; name: string };

/** Clients a contractor can share to (own clients with viewer invites). */
export async function getContractorViewerClients(): Promise<ViewerClientOption[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id)
    .is("organization_id", null)
    .order("name");

  if (!clients?.length) return [];

  const ids = clients.map((c) => c.id);
  const { data: access } = await supabase
    .from("client_portal_access")
    .select("client_id")
    .in("client_id", ids);

  const withAccess = new Set((access ?? []).map((a) => a.client_id));
  return clients.filter((c) => withAccess.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
}

export async function shareTimeLogsToViewer(
  logIds: string[],
  clientId: string
): Promise<{ error?: string; shared?: number }> {
  if (!logIds.length) return { error: "Select at least one time log" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .is("organization_id", null)
    .maybeSingle();

  if (!client) return { error: "Client not found or not shareable" };

  const { data: logs } = await supabase
    .from("time_logs")
    .select("id")
    .eq("user_id", user.id)
    .in("id", logIds);

  const owned = (logs ?? []).map((l) => l.id);
  if (!owned.length) return { error: "No valid logs" };

  const rows = owned.map((time_log_id) => ({
    time_log_id,
    client_id: clientId,
    shared_by: user.id,
    source: "contractor" as const,
  }));

  const { error } = await supabase.from("time_log_viewer_shares").upsert(rows, {
    onConflict: "time_log_id,client_id",
  });

  if (error) return { error: error.message };
  revalidatePath("/logs");
  revalidatePath("/client");
  return { shared: owned.length };
}

export async function getViewerShareStatuses(
  logIds: string[]
): Promise<Record<string, { clientName: string; source: string }[]>> {
  if (!logIds.length) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data } = await supabase
    .from("time_log_viewer_shares")
    .select("time_log_id, source, clients(name)")
    .in("time_log_id", logIds);

  const out: Record<string, { clientName: string; source: string }[]> = {};
  for (const row of data ?? []) {
    const client = row.clients as unknown as { name: string } | null;
    const key = row.time_log_id;
    if (!out[key]) out[key] = [];
    out[key].push({
      clientName: client?.name ?? "Client",
      source: row.source,
    });
  }
  return out;
}

export async function publishOrgSharesToViewer(
  shareIds: string[],
  targetClientId: string
): Promise<{ error?: string; published?: number }> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "Permission denied" };
  }
  if (!shareIds.length) return { error: "Select submissions to publish" };

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", targetClientId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!client) return { error: "End client not found in your organization" };

  const { data: shares } = await supabase
    .from("time_log_shares")
    .select("id, time_log_id, status")
    .eq("organization_id", ctx.org.id)
    .in("id", shareIds)
    .eq("status", "approved");

  if (!shares?.length) return { error: "No approved submissions selected" };

  const viewerRows = shares.map((s) => ({
    time_log_id: s.time_log_id,
    client_id: targetClientId,
    shared_by: ctx.userId,
    source: "organization" as const,
    org_share_id: s.id,
  }));

  const { error: viewerErr } = await supabase
    .from("time_log_viewer_shares")
    .upsert(viewerRows, { onConflict: "time_log_id,client_id" });

  if (viewerErr) return { error: viewerErr.message };

  await supabase
    .from("time_log_shares")
    .update({
      status: "published",
      target_client_id: targetClientId,
    })
    .in(
      "id",
      shares.map((s) => s.id)
    );

  revalidatePath("/org/timesheets");
  revalidatePath("/client");
  return { published: shares.length };
}

export async function listOrgViewerClients(): Promise<ViewerClientOption[]> {
  const ctx = await getOrgContext();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .eq("organization_id", ctx.org.id)
    .order("name");

  return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
}
