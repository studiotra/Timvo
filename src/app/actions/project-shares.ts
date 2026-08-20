"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/app/actions/organizations";
import { revalidatePath } from "next/cache";

export type ProjectShareStatus = {
  organizationId: string;
  organizationName: string;
  status: string;
  shareId: string;
  mappedClientName?: string | null;
  mappedProjectName?: string | null;
};

export async function shareProjectWithOrg(
  projectId: string,
  organizationId: string
): Promise<{ error?: string; shareId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: project } = await supabase
    .from("projects")
    .select("id, client_id, clients(user_id, organization_id)")
    .eq("id", projectId)
    .maybeSingle();

  const client = project?.clients as unknown as {
    user_id: string;
    organization_id: string | null;
  } | null;

  if (!project || client?.user_id !== user.id || client.organization_id) {
    return { error: "You can only share your own projects" };
  }

  const { data: link } = await supabase
    .from("contractor_org_links")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("contractor_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!link) return { error: "You are not linked to this organization" };

  const { data, error } = await supabase
    .from("project_shares")
    .upsert(
      {
        project_id: projectId,
        organization_id: organizationId,
        shared_by: user.id,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,organization_id" }
    )
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath("/logs");
  revalidatePath("/org/assignments");
  return { shareId: data.id };
}

export async function revokeProjectShare(
  projectId: string,
  organizationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("project_shares")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("organization_id", organizationId)
    .eq("shared_by", user.id);

  if (error) return { error: error.message };
  revalidatePath("/clients");
  revalidatePath("/org/assignments");
  return {};
}

export async function getProjectSharesForProjects(
  projectIds: string[]
): Promise<Record<string, ProjectShareStatus[]>> {
  if (!projectIds.length) return {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data } = await supabase
    .from("project_shares")
    .select("id, project_id, organization_id, status, organizations(name)")
    .eq("shared_by", user.id)
    .in("project_id", projectIds)
    .eq("status", "active");

  const shareIds = (data ?? []).map((r) => r.id);
  const { data: mappings } = shareIds.length
    ? await supabase
        .from("project_share_mappings")
        .select("project_share_id, target_client_id, target_project_id")
        .in("project_share_id", shareIds)
    : { data: [] as { project_share_id: string; target_client_id: string; target_project_id: string }[] };

  const targetClientIds = [...new Set((mappings ?? []).map((m) => m.target_client_id))];
  const targetProjectIds = [...new Set((mappings ?? []).map((m) => m.target_project_id))];
  const admin = createAdminClient();
  const [{ data: clients }, { data: projects }] = await Promise.all([
    targetClientIds.length
      ? admin.from("clients").select("id, name").in("id", targetClientIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    targetProjectIds.length
      ? admin.from("projects").select("id, name").in("id", targetProjectIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const projectName = new Map((projects ?? []).map((p) => [p.id, p.name]));
  const mappingByShare = new Map(
    (mappings ?? []).map((m) => [
      m.project_share_id,
      {
        mappedClientName: clientName.get(m.target_client_id) ?? null,
        mappedProjectName: projectName.get(m.target_project_id) ?? null,
      },
    ])
  );

  const out: Record<string, ProjectShareStatus[]> = {};
  for (const row of data ?? []) {
    const org = row.organizations as unknown as { name: string } | null;
    const mapping = mappingByShare.get(row.id);
    if (!out[row.project_id]) out[row.project_id] = [];
    out[row.project_id].push({
      shareId: row.id,
      organizationId: row.organization_id,
      organizationName: org?.name ?? "Organization",
      status: row.status,
      mappedClientName: mapping?.mappedClientName ?? null,
      mappedProjectName: mapping?.mappedProjectName ?? null,
    });
  }
  return out;
}

export type AssignmentShareRow = {
  shareId: string;
  projectId: string;
  projectName: string;
  contractorClientName: string;
  contractorEmail: string;
  contractorUserId: string;
  hours: number;
  mappingId: string | null;
  targetClientId: string | null;
  targetProjectId: string | null;
  targetClientName: string | null;
  targetProjectName: string | null;
};

export type AssignmentBoardData = {
  unmapped: AssignmentShareRow[];
  mapped: AssignmentShareRow[];
  targets: {
    clientId: string;
    clientName: string;
    projects: { id: string; name: string }[];
  }[];
};

export async function getOrgAssignmentBoard(): Promise<AssignmentBoardData> {
  const ctx = await getOrgContext();
  if (!ctx) return { unmapped: [], mapped: [], targets: [] };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { unmapped: [], mapped: [], targets: [] };
  }

  const admin = createAdminClient();
  const { data: shares } = await admin
    .from("project_shares")
    .select("id, project_id, shared_by, status")
    .eq("organization_id", ctx.org.id)
    .eq("status", "active");

  if (!shares?.length) {
    const targets = await listOrgTargetProjects(admin, ctx.org.id);
    return { unmapped: [], mapped: [], targets };
  }

  const projectIds = shares.map((s) => s.project_id);
  const { data: projects } = await admin
    .from("projects")
    .select("id, name, client_id, clients(name)")
    .in("id", projectIds);

  const projectById = new Map(
    (projects ?? []).map((p) => {
      const client = p.clients as unknown as { name: string } | null;
      return [
        p.id,
        {
          name: p.name,
          clientName: client?.name ?? "—",
        },
      ] as const;
    })
  );

  const { data: mappings } = await admin
    .from("project_share_mappings")
    .select("id, project_share_id, target_client_id, target_project_id")
    .eq("organization_id", ctx.org.id);

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

  const clientNameById = new Map((targetClients ?? []).map((c) => [c.id, c.name]));
  const projectNameById = new Map((targetProjects ?? []).map((p) => [p.id, p.name]));

  const mappingByShare = new Map(
    (mappings ?? []).map((m) => [
      m.project_share_id,
      {
        id: m.id,
        targetClientId: m.target_client_id,
        targetProjectId: m.target_project_id,
        targetClientName: clientNameById.get(m.target_client_id) ?? null,
        targetProjectName: projectNameById.get(m.target_project_id) ?? null,
      },
    ] as const)
  );

  const { data: logs } = await admin
    .from("time_logs")
    .select("project_id, duration_minutes")
    .in("project_id", projectIds);

  const hoursByProject: Record<string, number> = {};
  for (const log of logs ?? []) {
    hoursByProject[log.project_id] =
      (hoursByProject[log.project_id] ?? 0) + (log.duration_minutes ?? 0) / 60;
  }

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? "Unknown"])
  );

  const rows: AssignmentShareRow[] = shares.map((s) => {
    const proj = projectById.get(s.project_id);
    const mapping = mappingByShare.get(s.id);
    return {
      shareId: s.id,
      projectId: s.project_id,
      projectName: proj?.name ?? "—",
      contractorClientName: proj?.clientName ?? "—",
      contractorEmail: emailById.get(s.shared_by) ?? "Unknown",
      contractorUserId: s.shared_by,
      hours: Math.round((hoursByProject[s.project_id] ?? 0) * 10) / 10,
      mappingId: mapping?.id ?? null,
      targetClientId: mapping?.targetClientId ?? null,
      targetProjectId: mapping?.targetProjectId ?? null,
      targetClientName: mapping?.targetClientName ?? null,
      targetProjectName: mapping?.targetProjectName ?? null,
    };
  });

  const targets = await listOrgTargetProjects(admin, ctx.org.id);

  return {
    unmapped: rows.filter((r) => !r.mappingId),
    mapped: rows.filter((r) => r.mappingId),
    targets,
  };
}

async function listOrgTargetProjects(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string
) {
  const { data: clients } = await admin
    .from("clients")
    .select("id, name, projects(id, name, status)")
    .eq("organization_id", orgId)
    .order("name");

  return (clients ?? []).map((c) => ({
    clientId: c.id,
    clientName: c.name,
    projects: ((c.projects as { id: string; name: string; status: string }[]) ?? [])
      .filter((p) => p.status === "active")
      .map((p) => ({ id: p.id, name: p.name })),
  }));
}

export async function mapProjectShare(
  shareId: string,
  targetClientId: string,
  targetProjectId: string
): Promise<{ error?: string }> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "Permission denied" };
  }

  const admin = createAdminClient();
  const { data: share } = await admin
    .from("project_shares")
    .select("id, organization_id, status")
    .eq("id", shareId)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();

  if (!share || share.status !== "active") return { error: "Share not found" };

  const { data: targetProject } = await admin
    .from("projects")
    .select("id, client_id, clients(organization_id)")
    .eq("id", targetProjectId)
    .maybeSingle();

  const client = targetProject?.clients as unknown as { organization_id: string } | null;
  if (
    !targetProject ||
    targetProject.client_id !== targetClientId ||
    client?.organization_id !== ctx.org.id
  ) {
    return { error: "Invalid target project" };
  }

  const { error } = await admin.from("project_share_mappings").upsert(
    {
      project_share_id: shareId,
      organization_id: ctx.org.id,
      target_client_id: targetClientId,
      target_project_id: targetProjectId,
      mapped_by: ctx.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_share_id" }
  );

  if (error) return { error: error.message };
  revalidatePath("/org/assignments");
  revalidatePath("/org/timesheets");
  return {};
}

export async function unmapProjectShare(shareId: string): Promise<{ error?: string }> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "Permission denied" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("project_share_mappings")
    .delete()
    .eq("project_share_id", shareId)
    .eq("organization_id", ctx.org.id);

  if (error) return { error: error.message };
  revalidatePath("/org/assignments");
  return {};
}
