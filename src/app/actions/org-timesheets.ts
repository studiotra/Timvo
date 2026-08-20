"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/app/actions/organizations";
import { revalidatePath } from "next/cache";

export type TimeLogShareRow = {
  shareId: string;
  timeLogId: string;
  status: string;
  submittedAt: string;
  contractorEmail: string;
  clientName: string;
  projectName: string;
  durationMinutes: number;
  description: string | null;
  startedAt: string;
};

export async function submitTimeLogsToOrg(
  logIds: string[],
  organizationId: string
): Promise<{ error?: string; submitted?: number }> {
  if (!logIds.length) return { error: "Select at least one time log" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: link } = await supabase
    .from("contractor_org_links")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("contractor_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!link) return { error: "You are not linked to this organization" };

  const { data: logs } = await supabase
    .from("time_logs")
    .select("id")
    .eq("user_id", user.id)
    .in("id", logIds);

  const ownedIds = new Set((logs ?? []).map((l) => l.id));
  const toSubmit = logIds.filter((id) => ownedIds.has(id));
  if (!toSubmit.length) return { error: "No valid time logs to submit" };

  const rows = toSubmit.map((time_log_id) => ({
    time_log_id,
    organization_id: organizationId,
    submitted_by: user.id,
    status: "submitted" as const,
  }));

  const { error } = await supabase.from("time_log_shares").upsert(rows, {
    onConflict: "time_log_id,organization_id",
    ignoreDuplicates: false,
  });

  if (error) {
    if (error.code === "23505") return { error: "Some logs were already submitted to this org" };
    return { error: error.message };
  }

  revalidatePath("/logs");
  revalidatePath("/org/timesheets");
  return { submitted: toSubmit.length };
}

export async function getLogShareStatuses(
  logIds: string[]
): Promise<Record<string, { orgName: string; status: string }[]>> {
  if (!logIds.length) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data } = await supabase
    .from("time_log_shares")
    .select("time_log_id, status, organizations(name)")
    .eq("submitted_by", user.id)
    .in("time_log_id", logIds);

  const out: Record<string, { orgName: string; status: string }[]> = {};
  for (const row of data ?? []) {
    const org = row.organizations as unknown as { name: string } | null;
    const key = row.time_log_id;
    if (!out[key]) out[key] = [];
    out[key].push({ orgName: org?.name ?? "Organization", status: row.status });
  }
  return out;
}

export async function listOrgTimesheets(status?: string): Promise<TimeLogShareRow[]> {
  const ctx = await getOrgContext();
  if (!ctx) return [];
  if (!["owner", "admin", "manager"].includes(ctx.role)) return [];

  const supabase = await createClient();
  let query = supabase
    .from("time_log_shares")
    .select(
      "id, status, created_at, submitted_by, time_logs(id, started_at, duration_minutes, description, projects(name, clients(name)))"
    )
    .eq("organization_id", ctx.org.id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data } = await query;
  if (!data?.length) return [];

  const admin = await import("@/lib/supabase/admin").then((m) => m.createAdminClient());
  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? "Unknown"])
  );

  return data
    .map((row) => {
      const log = row.time_logs as unknown as {
        id: string;
        started_at: string;
        duration_minutes: number | null;
        description: string | null;
        projects: { name: string; clients: { name: string } | null } | null;
      } | null;
      if (!log) return null;
      return {
        shareId: row.id,
        timeLogId: log.id,
        status: row.status,
        submittedAt: row.created_at,
        contractorEmail: emailById.get(row.submitted_by) ?? "Unknown",
        clientName: log.projects?.clients?.name ?? "—",
        projectName: log.projects?.name ?? "—",
        durationMinutes: log.duration_minutes ?? 0,
        description: log.description,
        startedAt: log.started_at,
      };
    })
    .filter(Boolean) as TimeLogShareRow[];
}

export async function reviewTimeLogShare(
  shareId: string,
  action: "approve" | "reject",
  note?: string
): Promise<{ error?: string }> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "You do not have permission to review timesheets" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("time_log_shares")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
      review_note: note?.trim() || null,
    })
    .eq("id", shareId)
    .eq("organization_id", ctx.org.id)
    .eq("status", "submitted");

  if (error) return { error: error.message };
  revalidatePath("/org/timesheets");
  return {};
}
