"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/app/actions/organizations";
import { revalidatePath } from "next/cache";

export type OrgProjectRow = {
  id: string;
  name: string;
  status: string;
  billing_type: string;
  bill_rate: number | null;
  retainer_hours: number | null;
  retainer_amount: number | null;
  alert_threshold_pct: number | null;
  usedHours: number;
  contractors: ProjectContractorRow[];
};

export type ProjectContractorRow = {
  id: string;
  contractorUserId: string;
  email: string;
  costRate: number | null;
  billRate: number | null;
};

export async function getOrgClient(clientId: string) {
  const ctx = await getOrgContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("id", clientId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  return data;
}

export async function listOrgProjects(clientId: string): Promise<OrgProjectRow[]> {
  const ctx = await getOrgContext();
  if (!ctx) return [];

  const admin = createAdminClient();
  const { data: orgClient } = await admin
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();
  if (!orgClient) return [];

  // Service role: projects SELECT policies still recurse via clients RLS.
  const { data: projects } = await admin
    .from("projects")
    .select(
      "id, name, status, billing_type, bill_rate, retainer_hours, retainer_amount, alert_threshold_pct"
    )
    .eq("client_id", clientId)
    .order("name");

  if (!projects?.length) return [];

  const projectIds = projects.map((p) => p.id);

  // Include hours from contractor projects mapped onto these agency projects
  const { data: mappings } = await admin
    .from("project_share_mappings")
    .select("target_project_id, project_share_id")
    .eq("organization_id", ctx.org.id)
    .in("target_project_id", projectIds);

  const shareIds = [...new Set((mappings ?? []).map((m) => m.project_share_id))];
  const { data: mappedShares } = shareIds.length
    ? await admin
        .from("project_shares")
        .select("id, project_id, status")
        .in("id", shareIds)
        .eq("status", "active")
    : { data: [] as { id: string; project_id: string; status: string }[] };

  const shareProjectById = new Map((mappedShares ?? []).map((s) => [s.id, s.project_id]));
  const logProjectIds = new Set(projectIds);
  for (const m of mappings ?? []) {
    const contractorProjectId = shareProjectById.get(m.project_share_id);
    if (contractorProjectId) logProjectIds.add(contractorProjectId);
  }

  const { data: logs } = await admin
    .from("time_logs")
    .select("project_id, duration_minutes")
    .in("project_id", [...logProjectIds]);

  const hoursTowardTarget: Record<string, number> = {};
  for (const id of projectIds) hoursTowardTarget[id] = 0;

  const targetByContractorProject = new Map<string, string>();
  for (const m of mappings ?? []) {
    const contractorProjectId = shareProjectById.get(m.project_share_id);
    if (contractorProjectId) {
      targetByContractorProject.set(contractorProjectId, m.target_project_id);
    }
  }

  for (const log of logs ?? []) {
    const mins = log.duration_minutes ?? 0;
    if (hoursTowardTarget[log.project_id] != null) {
      hoursTowardTarget[log.project_id] += mins;
    }
    const mappedTarget = targetByContractorProject.get(log.project_id);
    if (mappedTarget && hoursTowardTarget[mappedTarget] != null) {
      hoursTowardTarget[mappedTarget] += mins;
    }
  }

  const { data: assignments } = await admin
    .from("project_contractors")
    .select("id, project_id, contractor_user_id, cost_rate, bill_rate")
    .in("project_id", projectIds);

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? "Unknown"])
  );

  const contractorsByProject: Record<string, ProjectContractorRow[]> = {};
  for (const a of assignments ?? []) {
    if (!contractorsByProject[a.project_id]) contractorsByProject[a.project_id] = [];
    contractorsByProject[a.project_id].push({
      id: a.id,
      contractorUserId: a.contractor_user_id,
      email: emailById.get(a.contractor_user_id) ?? "Unknown",
      costRate: a.cost_rate != null ? Number(a.cost_rate) : null,
      billRate: a.bill_rate != null ? Number(a.bill_rate) : null,
    });
  }

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    billing_type: p.billing_type,
    bill_rate: p.bill_rate != null ? Number(p.bill_rate) : null,
    retainer_hours: p.retainer_hours != null ? Number(p.retainer_hours) : null,
    retainer_amount: p.retainer_amount != null ? Number(p.retainer_amount) : null,
    alert_threshold_pct: p.alert_threshold_pct,
    usedHours: (hoursTowardTarget[p.id] ?? 0) / 60,
    contractors: contractorsByProject[p.id] ?? [],
  }));
}

export async function addOrgProject(clientId: string, formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "Permission denied" };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Project name is required" };

  const billing_type = (formData.get("billing_type") as "hourly" | "fixed") || "hourly";
  const billRateRaw = (formData.get("bill_rate") as string)?.trim();
  const retainerHoursRaw = (formData.get("retainer_hours") as string)?.trim();
  const retainerAmountRaw = (formData.get("retainer_amount") as string)?.trim();
  const thresholdRaw = (formData.get("alert_threshold_pct") as string)?.trim();
  const agreedFeeRaw = (formData.get("agreed_fee") as string)?.trim();

  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert({
    client_id: clientId,
    name,
    billing_type,
    status: "active",
    bill_rate: billRateRaw ? parseFloat(billRateRaw) : null,
    hourly_rate: billRateRaw ? parseFloat(billRateRaw) : null,
    retainer_hours: retainerHoursRaw ? parseFloat(retainerHoursRaw) : null,
    retainer_amount: retainerAmountRaw ? parseFloat(retainerAmountRaw) : null,
    alert_threshold_pct: thresholdRaw ? parseInt(thresholdRaw, 10) : 80,
    agreed_fee: agreedFeeRaw ? parseFloat(agreedFeeRaw) : null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/org/clients/${clientId}`);
  revalidatePath("/org/clients");
  return { success: true };
}

export async function assignContractorToProject(
  projectId: string,
  contractorEmail: string,
  costRate?: number,
  billRate?: number
) {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "Permission denied" };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, client_id, clients!inner(organization_id)")
    .eq("id", projectId)
    .maybeSingle();

  const client = project?.clients as unknown as { organization_id: string } | null;
  if (!project || client?.organization_id !== ctx.org.id) {
    return { error: "Project not found" };
  }

  const admin = await import("@/lib/supabase/admin").then((m) => m.createAdminClient());
  const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const contractor = listData?.users?.find(
    (u) => u.email?.toLowerCase() === contractorEmail.trim().toLowerCase()
  );
  if (!contractor) return { error: "Contractor account not found" };

  const { data: link } = await supabase
    .from("contractor_org_links")
    .select("id")
    .eq("organization_id", ctx.org.id)
    .eq("contractor_user_id", contractor.id)
    .eq("status", "active")
    .maybeSingle();

  if (!link) {
    return { error: "Contractor must be linked to your organization first" };
  }

  const { error } = await supabase.from("project_contractors").upsert(
    {
      project_id: projectId,
      contractor_user_id: contractor.id,
      cost_rate: costRate ?? null,
      bill_rate: billRate ?? null,
    },
    { onConflict: "project_id,contractor_user_id" }
  );

  if (error) return { error: error.message };
  revalidatePath(`/org/clients/${project.client_id}`);
  return { success: true };
}

export async function removeContractorFromProject(
  projectId: string,
  contractorUserId: string
): Promise<{ error?: string }> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "Permission denied" };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("client_id, clients!inner(organization_id)")
    .eq("id", projectId)
    .maybeSingle();

  const client = project?.clients as unknown as { organization_id: string } | null;
  if (!project || client?.organization_id !== ctx.org.id) {
    return { error: "Project not found" };
  }

  const { error } = await supabase
    .from("project_contractors")
    .delete()
    .eq("project_id", projectId)
    .eq("contractor_user_id", contractorUserId);

  if (error) return { error: error.message };
  revalidatePath(`/org/clients/${project.client_id}`);
  return {};
}

export type RetainerAlertRow = {
  projectId: string;
  projectName: string;
  clientName: string;
  retainerHours: number;
  usedHours: number;
  pct: number;
};

export async function getOrgRetainerAlerts(): Promise<RetainerAlertRow[]> {
  const ctx = await getOrgContext();
  if (!ctx) return [];

  const admin = createAdminClient();
  const { data: clients } = await admin
    .from("clients")
    .select("id, name, projects(id, name, retainer_hours, alert_threshold_pct, status)")
    .eq("organization_id", ctx.org.id);

  // Hours on contractor projects that map to each agency project
  const { data: mappings } = await admin
    .from("project_share_mappings")
    .select("target_project_id, project_share_id")
    .eq("organization_id", ctx.org.id);

  const shareIds = [...new Set((mappings ?? []).map((m) => m.project_share_id))];
  const { data: projectShares } = shareIds.length
    ? await admin
        .from("project_shares")
        .select("id, project_id, status")
        .in("id", shareIds)
    : { data: [] as { id: string; project_id: string; status: string }[] };

  const shareById = new Map((projectShares ?? []).map((s) => [s.id, s]));
  const contractorProjectsByTarget = new Map<string, string[]>();
  for (const m of mappings ?? []) {
    const share = shareById.get(m.project_share_id);
    if (!share || share.status !== "active") continue;
    const list = contractorProjectsByTarget.get(m.target_project_id) ?? [];
    list.push(share.project_id);
    contractorProjectsByTarget.set(m.target_project_id, list);
  }

  const alerts: RetainerAlertRow[] = [];
  for (const client of clients ?? []) {
    const projects =
      (client.projects as {
        id: string;
        name: string;
        retainer_hours: number | null;
        alert_threshold_pct: number | null;
        status: string;
      }[]) ?? [];
    for (const project of projects) {
      if (!project.retainer_hours || project.status !== "active") continue;

      const sourceProjectIds = [
        project.id,
        ...(contractorProjectsByTarget.get(project.id) ?? []),
      ];
      const { data: logs } = await admin
        .from("time_logs")
        .select("duration_minutes")
        .in("project_id", sourceProjectIds);

      const usedMins = (logs ?? []).reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
      const usedHours = usedMins / 60;
      const threshold = project.alert_threshold_pct ?? 80;
      const pct = (usedHours / Number(project.retainer_hours)) * 100;
      if (pct >= threshold) {
        alerts.push({
          projectId: project.id,
          projectName: project.name,
          clientName: client.name,
          retainerHours: Number(project.retainer_hours),
          usedHours,
          pct: Math.round(pct),
        });
      }
    }
  }
  return alerts.sort((a, b) => b.pct - a.pct);
}

export type ProfitabilityRow = {
  label: string;
  hours: number;
  cost: number;
  revenue: number;
  margin: number;
};

export async function getOrgProfitabilityReport(): Promise<ProfitabilityRow[]> {
  const ctx = await getOrgContext();
  if (!ctx) return [];

  const admin = createAdminClient();
  const { data: shares } = await admin
    .from("time_log_shares")
    .select("cost_rate, bill_rate, submitted_by, time_logs(duration_minutes, project_id)")
    .eq("organization_id", ctx.org.id)
    .in("status", ["approved", "published"]);

  const { data: projectShares } = await admin
    .from("project_shares")
    .select("id, project_id")
    .eq("organization_id", ctx.org.id)
    .eq("status", "active");

  const shareIds = (projectShares ?? []).map((s) => s.id);
  const contractorProjectToShare = new Map(
    (projectShares ?? []).map((s) => [s.project_id, s.id])
  );

  const { data: mappings } = shareIds.length
    ? await admin
        .from("project_share_mappings")
        .select("project_share_id, target_client_id, target_project_id")
        .eq("organization_id", ctx.org.id)
        .in("project_share_id", shareIds)
    : { data: [] as { project_share_id: string; target_client_id: string; target_project_id: string }[] };

  const targetClientIds = [...new Set((mappings ?? []).map((m) => m.target_client_id))];
  const targetProjectIds = [...new Set((mappings ?? []).map((m) => m.target_project_id))];

  const [{ data: targetClients }, { data: targetProjects }] = await Promise.all([
    targetClientIds.length
      ? admin.from("clients").select("id, name").in("id", targetClientIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    targetProjectIds.length
      ? admin.from("projects").select("id, name").in("id", targetProjectIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const clientName = new Map((targetClients ?? []).map((c) => [c.id, c.name]));
  const projectName = new Map((targetProjects ?? []).map((p) => [p.id, p.name]));
  const mappingByShareId = new Map(
    (mappings ?? []).map((m) => [
      m.project_share_id,
      {
        label: `${clientName.get(m.target_client_id) ?? "Client"} · ${projectName.get(m.target_project_id) ?? "Project"}`,
      },
    ])
  );

  const byLabel: Record<string, { hours: number; cost: number; revenue: number }> = {};

  for (const share of shares ?? []) {
    const log = share.time_logs as unknown as {
      duration_minutes: number | null;
      project_id: string;
    } | null;
    const mins = log?.duration_minutes ?? 0;
    const hours = mins / 60;
    const costRate = Number(share.cost_rate) || 0;
    const billRate = Number(share.bill_rate) || 0;

    const projectShareId = log?.project_id
      ? contractorProjectToShare.get(log.project_id)
      : undefined;
    const mapped = projectShareId ? mappingByShareId.get(projectShareId) : undefined;
    const key = mapped?.label ?? "Unmapped contractor submissions";

    if (!byLabel[key]) byLabel[key] = { hours: 0, cost: 0, revenue: 0 };
    byLabel[key].hours += hours;
    byLabel[key].cost += hours * costRate;
    byLabel[key].revenue += hours * billRate;
  }

  // Org staff time on org-owned projects (no timesheet approval required)
  const { data: orgClients } = await admin
    .from("clients")
    .select("id, name")
    .eq("organization_id", ctx.org.id);
  const orgClientIds = (orgClients ?? []).map((c) => c.id);
  const orgClientName = new Map((orgClients ?? []).map((c) => [c.id, c.name]));

  if (orgClientIds.length) {
    const { data: orgProjects } = await admin
      .from("projects")
      .select("id, name, client_id, bill_rate, hourly_rate")
      .in("client_id", orgClientIds);
    const orgProjectIds = (orgProjects ?? []).map((p) => p.id);
    const orgProjectMeta = new Map(
      (orgProjects ?? []).map((p) => [
        p.id,
        {
          label: `${orgClientName.get(p.client_id) ?? "Client"} · ${p.name}`,
          billRate:
            p.bill_rate != null
              ? Number(p.bill_rate)
              : p.hourly_rate != null
                ? Number(p.hourly_rate)
                : 0,
        },
      ])
    );

    if (orgProjectIds.length) {
      const { data: members } = await admin
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", ctx.org.id);
      const memberIds = (members ?? []).map((m) => m.user_id);

      const { data: staffLogs } =
        memberIds.length > 0
          ? await admin
              .from("time_logs")
              .select("duration_minutes, project_id")
              .in("project_id", orgProjectIds)
              .in("user_id", memberIds)
              .not("ended_at", "is", null)
          : { data: [] as { duration_minutes: number | null; project_id: string }[] };

      for (const log of staffLogs ?? []) {
        const meta = orgProjectMeta.get(log.project_id);
        if (!meta) continue;
        const hours = (log.duration_minutes ?? 0) / 60;
        if (!byLabel[meta.label]) byLabel[meta.label] = { hours: 0, cost: 0, revenue: 0 };
        byLabel[meta.label].hours += hours;
        byLabel[meta.label].revenue += hours * meta.billRate;
        // Internal staff cost defaults to 0 (no contractor cost rate)
      }
    }
  }

  return Object.entries(byLabel)
    .map(([label, v]) => ({
      label,
      hours: Math.round(v.hours * 10) / 10,
      cost: Math.round(v.cost * 100) / 100,
      revenue: Math.round(v.revenue * 100) / 100,
      margin: Math.round((v.revenue - v.cost) * 100) / 100,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
