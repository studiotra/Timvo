"use server";

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

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, name, status, billing_type, bill_rate, retainer_hours, retainer_amount, alert_threshold_pct"
    )
    .eq("client_id", clientId)
    .order("name");

  if (!projects?.length) return [];

  const projectIds = projects.map((p) => p.id);
  const { data: logs } = await supabase
    .from("time_logs")
    .select("project_id, duration_minutes")
    .in("project_id", projectIds);

  const { data: assignments } = await supabase
    .from("project_contractors")
    .select("id, project_id, contractor_user_id, cost_rate, bill_rate")
    .in("project_id", projectIds);

  const admin = await import("@/lib/supabase/admin").then((m) => m.createAdminClient());
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

  const usedByProject: Record<string, number> = {};
  for (const log of logs ?? []) {
    usedByProject[log.project_id] =
      (usedByProject[log.project_id] ?? 0) + (log.duration_minutes ?? 0);
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
    usedHours: (usedByProject[p.id] ?? 0) / 60,
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

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, projects(id, name, retainer_hours, status)")
    .eq("organization_id", ctx.org.id);

  const alerts: RetainerAlertRow[] = [];
  for (const client of clients ?? []) {
    const projects = (client.projects as {
      id: string;
      name: string;
      retainer_hours: number | null;
      status: string;
    }[]) ?? [];
    for (const project of projects) {
      if (!project.retainer_hours || project.status !== "active") continue;
      const { data: logs } = await supabase
        .from("time_logs")
        .select("duration_minutes")
        .eq("project_id", project.id);
      const usedMins = (logs ?? []).reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
      const usedHours = usedMins / 60;
      const pct = (usedHours / Number(project.retainer_hours)) * 100;
      if (pct >= 80) {
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

  const supabase = await createClient();
  const { data: shares } = await supabase
    .from("time_log_shares")
    .select(
      "cost_rate, bill_rate, time_logs(duration_minutes), organizations(name)"
    )
    .eq("organization_id", ctx.org.id)
    .in("status", ["approved", "published"]);

  const byContractor: Record<string, { hours: number; cost: number; revenue: number }> = {};

  for (const share of shares ?? []) {
    const log = share.time_logs as unknown as { duration_minutes: number | null } | null;
    const mins = log?.duration_minutes ?? 0;
    const hours = mins / 60;
    const costRate = Number(share.cost_rate) || 0;
    const billRate = Number(share.bill_rate) || 0;
    const key = "Contractor submissions";
    if (!byContractor[key]) byContractor[key] = { hours: 0, cost: 0, revenue: 0 };
    byContractor[key].hours += hours;
    byContractor[key].cost += hours * costRate;
    byContractor[key].revenue += hours * billRate;
  }

  const { data: orgProjects } = await supabase
    .from("projects")
    .select("id, name, bill_rate, clients!inner(name, organization_id)")
    .eq("clients.organization_id", ctx.org.id);

  for (const project of orgProjects ?? []) {
    const client = project.clients as unknown as { name: string };
    const { data: logs } = await supabase
      .from("time_logs")
      .select("duration_minutes")
      .eq("project_id", project.id);
    const hours =
      (logs ?? []).reduce((s, l) => s + (l.duration_minutes ?? 0), 0) / 60;
    if (hours <= 0) continue;
    const billRate = Number(project.bill_rate) || 0;
    const key = `${client.name} · ${project.name}`;
    byContractor[key] = {
      hours,
      cost: 0,
      revenue: hours * billRate,
    };
  }

  return Object.entries(byContractor).map(([label, v]) => ({
    label,
    hours: Math.round(v.hours * 10) / 10,
    cost: Math.round(v.cost * 100) / 100,
    revenue: Math.round(v.revenue * 100) / 100,
    margin: Math.round((v.revenue - v.cost) * 100) / 100,
  }));
}
