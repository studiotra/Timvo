import { createAdminClient } from "@/lib/supabase/admin";
import {
  getActiveTimerForUser,
  listServicesForUser,
  listTasksForProjectService,
  stopTimerForUser,
} from "@/lib/slack/timer-ops";

export type DesktopClient = {
  id: string;
  name: string;
  isOrg: boolean;
  /** solo | org_staff | org_assigned */
  source: "solo" | "org_staff" | "org_assigned";
  orgName?: string;
};

export type DesktopProject = { id: string; name: string; clientId: string };

/** Own clients + org clients via project_contractors + org membership. */
export async function listDesktopClients(userId: string): Promise<DesktopClient[]> {
  const admin = createAdminClient();

  const { data: ownClients } = await admin
    .from("clients")
    .select("id, name")
    .eq("user_id", userId)
    .is("organization_id", null)
    .order("name");

  const own: DesktopClient[] = (ownClients ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    isOrg: false,
    source: "solo" as const,
  }));

  const { data: assignments } = await admin
    .from("project_contractors")
    .select("project_id")
    .eq("contractor_user_id", userId);

  const projectIds = [...new Set((assignments ?? []).map((a) => a.project_id))];
  const orgClients = new Map<string, DesktopClient>();

  if (projectIds.length) {
    const { data: projects } = await admin
      .from("projects")
      .select("client_id")
      .in("id", projectIds);
    const clientIds = [...new Set((projects ?? []).map((p) => p.client_id).filter(Boolean))];
    if (clientIds.length) {
      const { data: clients } = await admin
        .from("clients")
        .select("id, name, organization_id, organizations(name)")
        .in("id", clientIds);
      for (const client of clients ?? []) {
        if (!client.organization_id) continue;
        const org = client.organizations as unknown as { name: string } | null;
        orgClients.set(client.id, {
          id: client.id,
          name: client.name,
          isOrg: true,
          source: "org_assigned",
          orgName: org?.name ?? "Organization",
        });
      }
    }
  }

  const { data: memberships } = await admin
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", userId);
  const orgMeta = new Map<string, string>();
  for (const m of memberships ?? []) {
    const org = m.organizations as unknown as { name: string } | null;
    orgMeta.set(m.organization_id, org?.name ?? "Organization");
  }
  const orgIds = [...orgMeta.keys()];
  if (orgIds.length) {
    const { data: staffClients } = await admin
      .from("clients")
      .select("id, name, organization_id")
      .in("organization_id", orgIds)
      .order("name");
    for (const c of staffClients ?? []) {
      orgClients.set(c.id, {
        id: c.id,
        name: c.name,
        isOrg: true,
        source: "org_staff",
        orgName: orgMeta.get(c.organization_id) ?? "Organization",
      });
    }
  }

  const team = [...orgClients.values()].sort((a, b) => a.name.localeCompare(b.name));
  const solo = own.sort((a, b) => a.name.localeCompare(b.name));
  // Org staff / assigned work first so agency users land on team clients
  return [...team, ...solo];
}

export async function listDesktopProjects(
  userId: string,
  clientId: string
): Promise<DesktopProject[]> {
  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, user_id, organization_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return [];

  if (client.organization_id) {
    const { data: membership } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", client.organization_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (membership) {
      const { data } = await admin
        .from("projects")
        .select("id, name, client_id")
        .eq("client_id", clientId)
        .eq("status", "active")
        .order("name");
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        clientId: p.client_id,
      }));
    }

    const { data: assignments } = await admin
      .from("project_contractors")
      .select("project_id, projects(id, name, client_id, status)")
      .eq("contractor_user_id", userId);

    return (assignments ?? [])
      .map((a) => {
        const p = a.projects as unknown as {
          id: string;
          name: string;
          client_id: string;
          status: string;
        } | null;
        if (!p || p.client_id !== clientId || p.status !== "active") return null;
        return { id: p.id, name: p.name, clientId: p.client_id };
      })
      .filter(Boolean) as DesktopProject[];
  }

  if (client.user_id !== userId) return [];

  const { data } = await admin
    .from("projects")
    .select("id, name, client_id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("name");

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    clientId: p.client_id,
  }));
}

async function userCanAccessProject(userId: string, projectId: string): Promise<boolean> {
  const clients = await listDesktopClients(userId);
  for (const c of clients) {
    const projs = await listDesktopProjects(userId, c.id);
    if (projs.some((p) => p.id === projectId)) return true;
  }
  return false;
}

export async function listDesktopServices(userId: string) {
  const admin = createAdminClient();
  return listServicesForUser(admin, userId);
}

export async function listDesktopTasks(projectId: string, serviceId: string) {
  const admin = createAdminClient();
  return listTasksForProjectService(admin, projectId, serviceId);
}

export async function getDesktopTimer(userId: string) {
  const admin = createAdminClient();
  return getActiveTimerForUser(admin, userId);
}

export async function startDesktopTimer(
  userId: string,
  projectId: string,
  options?: { taskId?: string; serviceId?: string; description?: string }
) {
  if (!(await userCanAccessProject(userId, projectId))) {
    return { error: "Project not found or not accessible" };
  }

  const admin = createAdminClient();

  const { data: active } = await admin
    .from("time_logs")
    .select("id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();

  if (active) {
    const ended = new Date();
    const started = new Date(active.started_at);
    const duration = Math.round((ended.getTime() - started.getTime()) / 60000);
    await admin
      .from("time_logs")
      .update({ ended_at: ended.toISOString(), duration_minutes: duration })
      .eq("id", active.id);
  }

  const { data, error } = await admin
    .from("time_logs")
    .insert({
      project_id: projectId,
      user_id: userId,
      task_id: options?.taskId || null,
      started_at: new Date().toISOString(),
      description: options?.description?.trim() || null,
      is_billable: true,
    })
    .select("id, started_at")
    .single();

  if (error) return { error: error.message };

  const timer = await getActiveTimerForUser(admin, userId);
  return {
    logId: data.id,
    startedAt: data.started_at,
    timer,
  };
}

export async function stopDesktopTimer(userId: string) {
  const admin = createAdminClient();
  return stopTimerForUser(admin, userId);
}
