"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryOrganizationId } from "@/lib/auth/routing";
import { revalidatePath } from "next/cache";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "org";
}

export type OrganizationSummary = {
  id: string;
  name: string;
  role: string;
};

export async function signUpOrganization(
  orgName: string,
  email: string,
  password: string
): Promise<{ error?: string }> {
  const trimmedName = orgName.trim();
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedName) return { error: "Organization name is required" };
  if (!trimmedEmail) return { error: "Email is required" };
  if (password.length < 6) return { error: "Password must be at least 6 characters" };

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: trimmedEmail,
    password,
    email_confirm: true,
  });

  if (authError) {
    const msg = authError.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("duplicate")) {
      return { error: "An account with this email already exists. Sign in instead." };
    }
    return { error: authError.message };
  }

  const userId = created.user?.id;
  if (!userId) return { error: "Could not create account" };

  let slug = slugify(trimmedName);
  const { data: existingSlug } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingSlug) slug = `${slug}-${userId.slice(0, 8)}`;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: trimmedName, slug, created_by: userId })
    .select("id")
    .single();

  if (orgError || !org) return { error: orgError?.message ?? "Could not create organization" };

  await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: userId,
    role: "owner",
  });

  await admin
    .from("profiles")
    .update({
      account_type: "organization",
      business_name: trimmedName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return {};
}

export async function getMyOrganizations(): Promise<OrganizationSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name)")
    .eq("user_id", user.id);

  return (data ?? [])
    .map((row) => {
      const org = row.organizations as unknown as { id: string; name: string } | null;
      if (!org) return null;
      return { id: org.id, name: org.name, role: row.role };
    })
    .filter(Boolean) as OrganizationSummary[];
}

export async function getOrgContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const orgId = await getPrimaryOrganizationId(supabase, user.id);
  if (!orgId) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", orgId)
    .single();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  return org ? { org, role: membership?.role ?? "viewer", userId: user.id } : null;
}

export async function createOrgClient(name: string, email?: string) {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "You do not have permission to add clients" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: name.trim(),
      email: email?.trim() || null,
      user_id: ctx.userId,
      organization_id: ctx.org.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/org/clients");
  revalidatePath("/org");
  return { success: true, clientId: data.id };
}

export type OrgClientRow = {
  id: string;
  name: string;
  email: string | null;
  projectCount: number;
};

export async function listOrgClients(): Promise<OrgClientRow[]> {
  const ctx = await getOrgContext();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("organization_id", ctx.org.id)
    .order("name");

  if (error || !clients?.length) return [];

  const clientIds = clients.map((c) => c.id);
  const admin = createAdminClient();
  const { data: projects } = await admin
    .from("projects")
    .select("client_id")
    .in("client_id", clientIds);

  const projectCountByClient: Record<string, number> = {};
  for (const p of projects ?? []) {
    projectCountByClient[p.client_id] = (projectCountByClient[p.client_id] ?? 0) + 1;
  }

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    projectCount: projectCountByClient[c.id] ?? 0,
  }));
}

export async function inviteContractorByEmail(email: string) {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "You do not have permission to invite contractors" };
  }

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: "Email is required" };

  const admin = createAdminClient();
  const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const contractor = listData?.users?.find((u) => u.email?.toLowerCase() === trimmed);
  if (!contractor) {
    return {
      error:
        "No Timvo contractor account found for that email. They should sign up as a contractor first.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contractor_org_links").upsert(
    {
      organization_id: ctx.org.id,
      contractor_user_id: contractor.id,
      status: "active",
      invited_by: ctx.userId,
    },
    { onConflict: "organization_id,contractor_user_id" }
  );

  if (error) return { error: error.message };
  revalidatePath("/org/contractors");
  return { success: true };
}

export type OrgContractorRow = {
  id: string;
  email: string;
  status: string;
};

export async function listOrgContractors(): Promise<OrgContractorRow[]> {
  const ctx = await getOrgContext();
  if (!ctx) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("contractor_org_links")
    .select("id, status, contractor_user_id")
    .eq("organization_id", ctx.org.id)
    .order("created_at", { ascending: false });

  if (!data?.length) return [];

  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? "Unknown"])
  );

  return data.map((row) => ({
    id: row.id,
    email: emailById.get(row.contractor_user_id) ?? "Unknown",
    status: row.status,
  }));
}

export type ContractorOrgOption = { id: string; name: string };

export async function getContractorOrganizations(): Promise<ContractorOrgOption[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("contractor_org_links")
    .select("organizations(id, name)")
    .eq("contractor_user_id", user.id)
    .eq("status", "active");

  return (data ?? [])
    .map((row) => row.organizations as unknown as { id: string; name: string } | null)
    .filter(Boolean)
    .map((org) => ({ id: org!.id, name: org!.name }));
}

export async function getOrgDashboardStats() {
  const ctx = await getOrgContext();
  if (!ctx) {
    return { clients: 0, projects: 0, contractors: 0, pendingTimesheets: 0, orgName: "" };
  }

  const supabase = await createClient();
  const [{ count: clientCount }, { data: orgClients }, { count: contractorCount }, { count: pending }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ctx.org.id),
      supabase.from("clients").select("id").eq("organization_id", ctx.org.id),
      supabase
        .from("contractor_org_links")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ctx.org.id)
        .eq("status", "active"),
      supabase
        .from("time_log_shares")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ctx.org.id)
        .eq("status", "submitted"),
    ]);

  const clientIds = (orgClients ?? []).map((c) => c.id);
  let projectCount = 0;
  if (clientIds.length) {
    const admin = createAdminClient();
    const { count } = await admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .in("client_id", clientIds);
    projectCount = count ?? 0;
  }

  return {
    orgName: ctx.org.name,
    clients: clientCount ?? 0,
    projects: projectCount,
    contractors: contractorCount ?? 0,
    pendingTimesheets: pending ?? 0,
  };
}
