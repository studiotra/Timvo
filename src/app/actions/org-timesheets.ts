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
  /** Contractor's own client/project names */
  clientName: string;
  projectName: string;
  /** Agency end-client mapping (null if unmapped) */
  mappedClientName: string | null;
  mappedProjectName: string | null;
  mappedProjectId: string | null;
  isMapped: boolean;
  durationMinutes: number;
  description: string | null;
  startedAt: string;
  defaultCostRate: number | null;
  defaultBillRate: number | null;
  costRate: number | null;
  billRate: number | null;
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

  const { data: logProjects } = await supabase
    .from("time_logs")
    .select("id, project_id, projects(client_id, clients(user_id, organization_id))")
    .in("id", toSubmit);

  const projectIds = [
    ...new Set((logProjects ?? []).map((l) => l.project_id).filter(Boolean)),
  ];

  for (const log of logProjects ?? []) {
    const project = log.projects as unknown as {
      client_id: string;
      clients: { user_id: string; organization_id: string | null } | null;
    } | null;
    if (!project?.clients || project.clients.user_id !== user.id) {
      return { error: "You can only submit time from your own projects" };
    }
    // Org-owned projects belong to an agency workspace — don't submit those as contractor shares
    if (project.clients.organization_id) {
      return {
        error:
          "Use your own contractor projects when submitting to an agency (not agency-owned projects).",
      };
    }
  }

  // Auto-share projects on submit so they appear in the agency Assignments inbox
  // without requiring a prior agency assignment or manual share step.
  if (projectIds.length) {
    const shareRows = projectIds.map((project_id) => ({
      project_id,
      organization_id: organizationId,
      shared_by: user.id,
      status: "active" as const,
      updated_at: new Date().toISOString(),
    }));
    const { error: shareError } = await supabase.from("project_shares").upsert(shareRows, {
      onConflict: "project_id,organization_id",
    });
    if (shareError) return { error: shareError.message };
  }

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
  revalidatePath("/clients");
  revalidatePath("/org/timesheets");
  revalidatePath("/org/assignments");
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

  const admin = await import("@/lib/supabase/admin").then((m) => m.createAdminClient());
  let query = admin
    .from("time_log_shares")
    .select(
      "id, status, created_at, submitted_by, cost_rate, bill_rate, time_logs(id, started_at, duration_minutes, description, project_id, projects(name, bill_rate, clients(name, organization_id)))"
    )
    .eq("organization_id", ctx.org.id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data } = await query;
  if (!data?.length) return [];

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? "Unknown"])
  );

  const projectIds = [
    ...new Set(
      data
        .map((row) => {
          const log = row.time_logs as unknown as { project_id?: string } | null;
          return log?.project_id;
        })
        .filter(Boolean) as string[]
    ),
  ];

  // Map contractor project → agency end client/project
  const mappingByContractorProject = new Map<
    string,
    {
      targetProjectId: string;
      targetClientName: string;
      targetProjectName: string;
      billRate: number | null;
    }
  >();
  /** Key: `${contractorProjectId}:${contractorUserId}` → rates from mapped agency project assignment */
  const assignmentByTarget = new Map<
    string,
    { cost_rate: number | null; bill_rate: number | null }
  >();

  if (projectIds.length) {
    const { data: projectShares } = await admin
      .from("project_shares")
      .select("id, project_id")
      .eq("organization_id", ctx.org.id)
      .eq("status", "active")
      .in("project_id", projectIds);

    const shareIds = (projectShares ?? []).map((s) => s.id);
    const shareProjectById = new Map(
      (projectShares ?? []).map((s) => [s.id, s.project_id])
    );

    if (shareIds.length) {
      const { data: mappings } = await admin
        .from("project_share_mappings")
        .select("project_share_id, target_client_id, target_project_id")
        .eq("organization_id", ctx.org.id)
        .in("project_share_id", shareIds);

      const targetProjectIds = [
        ...new Set((mappings ?? []).map((m) => m.target_project_id)),
      ];
      const targetClientIds = [
        ...new Set((mappings ?? []).map((m) => m.target_client_id)),
      ];

      const [{ data: targetProjects }, { data: targetClients }, { data: assignments }] =
        await Promise.all([
          targetProjectIds.length
            ? admin
                .from("projects")
                .select("id, name, bill_rate")
                .in("id", targetProjectIds)
            : Promise.resolve({ data: [] as { id: string; name: string; bill_rate: number | null }[] }),
          targetClientIds.length
            ? admin.from("clients").select("id, name").in("id", targetClientIds)
            : Promise.resolve({ data: [] as { id: string; name: string }[] }),
          targetProjectIds.length
            ? admin
                .from("project_contractors")
                .select("project_id, contractor_user_id, cost_rate, bill_rate")
                .in("project_id", targetProjectIds)
            : Promise.resolve({
                data: [] as {
                  project_id: string;
                  contractor_user_id: string;
                  cost_rate: number | null;
                  bill_rate: number | null;
                }[],
              }),
        ]);

      const projectMeta = new Map(
        (targetProjects ?? []).map((p) => [
          p.id,
          {
            name: p.name,
            billRate: p.bill_rate != null ? Number(p.bill_rate) : null,
          },
        ])
      );
      const clientMeta = new Map((targetClients ?? []).map((c) => [c.id, c.name]));

      for (const m of mappings ?? []) {
        const contractorProjectId = shareProjectById.get(m.project_share_id);
        if (!contractorProjectId) continue;
        const tp = projectMeta.get(m.target_project_id);
        mappingByContractorProject.set(contractorProjectId, {
          targetProjectId: m.target_project_id,
          targetClientName: clientMeta.get(m.target_client_id) ?? "—",
          targetProjectName: tp?.name ?? "—",
          billRate: tp?.billRate ?? null,
        });
      }

      for (const a of assignments ?? []) {
        for (const [contractorProjectId, mapping] of mappingByContractorProject) {
          if (mapping.targetProjectId !== a.project_id) continue;
          assignmentByTarget.set(`${contractorProjectId}:${a.contractor_user_id}`, {
            cost_rate: a.cost_rate != null ? Number(a.cost_rate) : null,
            bill_rate: a.bill_rate != null ? Number(a.bill_rate) : null,
          });
        }
      }
    }
  }

  const linkRates = new Map<string, number | null>();
  const contractorIds = [...new Set(data.map((row) => row.submitted_by))];
  if (contractorIds.length) {
    const { data: links } = await admin
      .from("contractor_org_links")
      .select("contractor_user_id, default_cost_rate")
      .eq("organization_id", ctx.org.id)
      .in("contractor_user_id", contractorIds);
    for (const link of links ?? []) {
      linkRates.set(
        link.contractor_user_id,
        link.default_cost_rate != null ? Number(link.default_cost_rate) : null
      );
    }
  }

  return data
    .map((row) => {
      const log = row.time_logs as unknown as {
        id: string;
        project_id: string;
        started_at: string;
        duration_minutes: number | null;
        description: string | null;
        projects: {
          name: string;
          bill_rate: number | null;
          clients: { name: string; organization_id: string | null } | null;
        } | null;
      } | null;
      if (!log) return null;

      const mapping = mappingByContractorProject.get(log.project_id);
      const assignment = assignmentByTarget.get(`${log.project_id}:${row.submitted_by}`);
      const orgLinkCost = linkRates.get(row.submitted_by) ?? null;

      const defaultCostRate = assignment?.cost_rate ?? orgLinkCost;
      const defaultBillRate =
        assignment?.bill_rate ??
        mapping?.billRate ??
        (log.projects?.bill_rate != null ? Number(log.projects.bill_rate) : null);

      return {
        shareId: row.id,
        timeLogId: log.id,
        status: row.status,
        submittedAt: row.created_at,
        contractorEmail: emailById.get(row.submitted_by) ?? "Unknown",
        clientName: log.projects?.clients?.name ?? "—",
        projectName: log.projects?.name ?? "—",
        mappedClientName: mapping?.targetClientName ?? null,
        mappedProjectName: mapping?.targetProjectName ?? null,
        mappedProjectId: mapping?.targetProjectId ?? null,
        isMapped: Boolean(mapping),
        durationMinutes: log.duration_minutes ?? 0,
        description: log.description,
        startedAt: log.started_at,
        defaultCostRate,
        defaultBillRate,
        costRate: row.cost_rate != null ? Number(row.cost_rate) : null,
        billRate: row.bill_rate != null ? Number(row.bill_rate) : null,
      };
    })
    .filter(Boolean) as TimeLogShareRow[];
}

function parseRate(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function resolveApprovalRates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  shareId: string,
  overrides?: { costRate?: number | null; billRate?: number | null }
): Promise<{ costRate: number | null; billRate: number | null }> {
  const admin = await import("@/lib/supabase/admin").then((m) => m.createAdminClient());

  const { data: share } = await admin
    .from("time_log_shares")
    .select("submitted_by, time_logs(project_id)")
    .eq("id", shareId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!share) return { costRate: null, billRate: null };

  const log = share.time_logs as unknown as { project_id: string } | null;
  const contractorProjectId = log?.project_id;

  const { data: link } = await admin
    .from("contractor_org_links")
    .select("default_cost_rate")
    .eq("organization_id", orgId)
    .eq("contractor_user_id", share.submitted_by)
    .maybeSingle();

  let mappedTargetProjectId: string | null = null;
  let mappedBillRate: number | null = null;
  let assignmentCost: number | null = null;
  let assignmentBill: number | null = null;

  if (contractorProjectId) {
    const { data: projectShare } = await admin
      .from("project_shares")
      .select("id")
      .eq("organization_id", orgId)
      .eq("project_id", contractorProjectId)
      .eq("status", "active")
      .maybeSingle();

    if (projectShare) {
      const { data: mapping } = await admin
        .from("project_share_mappings")
        .select("target_project_id")
        .eq("organization_id", orgId)
        .eq("project_share_id", projectShare.id)
        .maybeSingle();

      if (mapping?.target_project_id) {
        mappedTargetProjectId = mapping.target_project_id;
        const [{ data: targetProject }, { data: assignment }] = await Promise.all([
          admin
            .from("projects")
            .select("bill_rate")
            .eq("id", mapping.target_project_id)
            .maybeSingle(),
          admin
            .from("project_contractors")
            .select("cost_rate, bill_rate")
            .eq("project_id", mapping.target_project_id)
            .eq("contractor_user_id", share.submitted_by)
            .maybeSingle(),
        ]);
        mappedBillRate =
          targetProject?.bill_rate != null ? Number(targetProject.bill_rate) : null;
        assignmentCost =
          assignment?.cost_rate != null ? Number(assignment.cost_rate) : null;
        assignmentBill =
          assignment?.bill_rate != null ? Number(assignment.bill_rate) : null;
      }
    }
  }

  void mappedTargetProjectId;
  void supabase;

  const defaultCost =
    assignmentCost ??
    (link?.default_cost_rate != null ? Number(link.default_cost_rate) : null);
  const defaultBill = assignmentBill ?? mappedBillRate;

  return {
    costRate: overrides?.costRate !== undefined ? overrides.costRate : defaultCost,
    billRate: overrides?.billRate !== undefined ? overrides.billRate : defaultBill,
  };
}

export async function reviewTimeLogShare(
  shareId: string,
  action: "approve" | "reject",
  options?: {
    note?: string;
    costRate?: number | string | null;
    billRate?: number | string | null;
  }
): Promise<{ error?: string }> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "You do not have permission to review timesheets" };
  }

  const supabase = await createClient();

  let costRate: number | null = null;
  let billRate: number | null = null;

  if (action === "approve") {
    const overrides = {
      costRate:
        options?.costRate !== undefined ? parseRate(options.costRate) : undefined,
      billRate:
        options?.billRate !== undefined ? parseRate(options.billRate) : undefined,
    };
    ({ costRate, billRate } = await resolveApprovalRates(
      supabase,
      ctx.org.id,
      shareId,
      overrides
    ));
  }

  const { error } = await supabase
    .from("time_log_shares")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
      review_note: options?.note?.trim() || null,
      ...(action === "approve" ? { cost_rate: costRate, bill_rate: billRate } : {}),
    })
    .eq("id", shareId)
    .eq("organization_id", ctx.org.id)
    .eq("status", "submitted");

  if (error) return { error: error.message };
  revalidatePath("/org/timesheets");
  revalidatePath("/org/reports");
  return {};
}

export async function bulkReviewTimeLogShares(
  shareIds: string[],
  action: "approve" | "reject"
): Promise<{ error?: string; processed?: number; failed?: number }> {
  if (!shareIds.length) return { error: "Select at least one timesheet" };

  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "You do not have permission to review timesheets" };
  }

  const uniqueIds = [...new Set(shareIds)];
  let processed = 0;
  let failed = 0;

  for (const shareId of uniqueIds) {
    const result = await reviewTimeLogShare(shareId, action);
    if (result.error) failed += 1;
    else processed += 1;
  }

  if (processed === 0 && failed > 0) {
    return { error: `Could not ${action} any selected timesheets`, processed, failed };
  }

  revalidatePath("/org/timesheets");
  revalidatePath("/org/reports");
  return { processed, failed };
}
