"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryOrganizationId } from "@/lib/auth/routing";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { randomBytes } from "crypto";

const ORG_INVITE_EXPIRY_DAYS = 14;

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "org";
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export type OrganizationSummary = {
  id: string;
  name: string;
  role: string;
};

export async function signUpOrganization(
  orgName: string,
  email: string,
  password: string,
  inviteToken?: string | null
): Promise<{ error?: string }> {
  const trimmedName = orgName.trim();
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedName) return { error: "Organization name is required" };
  if (!trimmedEmail) return { error: "Email is required" };
  if (password.length < 6) return { error: "Password must be at least 6 characters" };

  const admin = createAdminClient();

  let invite: {
    id: string;
    email: string;
    contractor_user_id: string;
    status: string;
    expires_at: string;
  } | null = null;

  if (inviteToken?.trim()) {
    const { data } = await admin
      .from("org_invites")
      .select("id, email, contractor_user_id, status, expires_at")
      .eq("token", inviteToken.trim())
      .maybeSingle();
    if (!data || data.status !== "pending") {
      return { error: "This invite link is invalid or already used" };
    }
    if (new Date(data.expires_at) < new Date()) {
      return { error: "This invite link has expired" };
    }
    if (data.email.toLowerCase() !== trimmedEmail) {
      return { error: `Sign up with the invited email (${data.email})` };
    }
    invite = data;
  }

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

  if (invite) {
    await admin.from("contractor_org_links").upsert(
      {
        organization_id: org.id,
        contractor_user_id: invite.contractor_user_id,
        status: "active",
        invited_by: userId,
      },
      { onConflict: "organization_id,contractor_user_id" }
    );
    await admin
      .from("org_invites")
      .update({
        status: "accepted",
        organization_id: org.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);
  }

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
      contractor_acknowledged_at: null,
    },
    { onConflict: "organization_id,contractor_user_id" }
  );

  if (error) return { error: error.message };

  await admin
    .from("contractor_org_links")
    .update({ contractor_acknowledged_at: null, status: "active" })
    .eq("organization_id", ctx.org.id)
    .eq("contractor_user_id", contractor.id);

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  let emailWarning: string | undefined;

  if (resendKey?.trim()) {
    const resend = new Resend(resendKey);
    const loginUrl = `${appBaseUrl()}/login`;
    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: trimmed,
      subject: `${ctx.org.name} linked you on Timvo`,
      html: `
        <p>Hi,</p>
        <p><strong>${ctx.org.name}</strong> linked your Timvo contractor account.</p>
        <p>You can now submit time logs and share projects with them from your contractor dashboard.</p>
        <p>
          <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Open Timvo</a>
        </p>
        <p>— Timvo</p>
      `,
    });
    if (sendError) {
      console.error("Resend error:", sendError);
      emailWarning = "Linked, but the notification email failed to send.";
    }
  } else {
    emailWarning = "Linked, but email is not configured (RESEND_API_KEY).";
  }

  revalidatePath("/org/contractors");
  return { success: true, emailWarning };
}

export async function unlinkContractor(linkId: string): Promise<{ error?: string }> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not in an organization" };
  if (!["owner", "admin", "manager"].includes(ctx.role)) {
    return { error: "Permission denied" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contractor_org_links")
    .update({ status: "inactive" })
    .eq("id", linkId)
    .eq("organization_id", ctx.org.id);

  if (error) return { error: error.message };
  revalidatePath("/org/contractors");
  return {};
}

export type OrgContractorRow = {
  id: string;
  contractorUserId: string;
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
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (!data?.length) return [];

  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? "Unknown"])
  );

  return data.map((row) => ({
    id: row.id,
    contractorUserId: row.contractor_user_id,
    email: emailById.get(row.contractor_user_id) ?? "Unknown",
    status: row.status,
  }));
}

export type ContractorOrgOption = { id: string; name: string; linkId?: string };

export async function getContractorOrganizations(): Promise<ContractorOrgOption[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("contractor_org_links")
    .select("id, organizations(id, name)")
    .eq("contractor_user_id", user.id)
    .eq("status", "active");

  return (data ?? [])
    .map((row) => {
      const org = row.organizations as unknown as { id: string; name: string } | null;
      if (!org) return null;
      return { id: org.id, name: org.name, linkId: row.id };
    })
    .filter(Boolean) as ContractorOrgOption[];
}

export type UnacknowledgedOrgLink = {
  linkId: string;
  organizationId: string;
  organizationName: string;
};

export async function getUnacknowledgedOrgLinks(): Promise<UnacknowledgedOrgLink[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("contractor_org_links")
    .select("id, organization_id, organizations(name)")
    .eq("contractor_user_id", user.id)
    .eq("status", "active")
    .is("contractor_acknowledged_at", null);

  return (data ?? []).map((row) => {
    const org = row.organizations as unknown as { name: string } | null;
    return {
      linkId: row.id,
      organizationId: row.organization_id,
      organizationName: org?.name ?? "Organization",
    };
  });
}

export async function acknowledgeOrgLink(linkId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("contractor_org_links")
    .update({ contractor_acknowledged_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("contractor_user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/logs");
  revalidatePath("/settings");
  return {};
}

export async function leaveOrganization(organizationId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("contractor_org_links")
    .update({ status: "inactive" })
    .eq("organization_id", organizationId)
    .eq("contractor_user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/logs");
  revalidatePath("/settings");
  revalidatePath("/clients");
  return {};
}

export async function inviteAgencyByEmail(
  email: string
): Promise<{ error?: string; inviteUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { error: "Email is required" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_name")
    .eq("id", user.id)
    .maybeSingle();

  const contractorName =
    profile?.business_name?.trim() ||
    profile?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "A Timvo contractor";

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ORG_INVITE_EXPIRY_DAYS);

  const { error: insertErr } = await supabase.from("org_invites").insert({
    token,
    email: trimmed,
    contractor_user_id: user.id,
    status: "pending",
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (insertErr) return { error: insertErr.message };

  const inviteUrl = `${appBaseUrl()}/signup/organization?invite=${token}`;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!resendKey?.trim()) {
    revalidatePath("/settings");
    return {
      error: "Invite created, but email is not configured. Add RESEND_API_KEY.",
      inviteUrl,
    };
  }

  const resend = new Resend(resendKey);
  const { error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: trimmed,
    subject: `${contractorName} invited you to Timvo for Organizations`,
    html: `
      <p>Hi,</p>
      <p><strong>${contractorName}</strong> invited your agency to Timvo.</p>
      <p>Create your organization account with this email (<strong>${trimmed}</strong>) and you'll be linked to their contractor profile automatically.</p>
      <p>
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Create organization account</a>
      </p>
      <p style="color:#6b7280;font-size:14px;">This link expires in ${ORG_INVITE_EXPIRY_DAYS} days.</p>
      <p>— Timvo</p>
    `,
  });

  if (sendError) {
    console.error("Resend error:", sendError);
    return {
      error: `Invite saved but email failed: ${sendError.message}`,
      inviteUrl,
    };
  }

  revalidatePath("/settings");
  return { inviteUrl };
}

export async function getOrgInviteByToken(token: string): Promise<{
  email: string;
  contractorName: string;
} | null> {
  if (!token.trim()) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("org_invites")
    .select("email, status, expires_at, contractor_user_id")
    .eq("token", token.trim())
    .maybeSingle();

  if (!data || data.status !== "pending") return null;
  if (new Date(data.expires_at) < new Date()) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, business_name")
    .eq("id", data.contractor_user_id)
    .maybeSingle();

  const { data: userData } = await admin.auth.admin.getUserById(data.contractor_user_id);

  return {
    email: data.email,
    contractorName:
      profile?.business_name?.trim() ||
      profile?.full_name?.trim() ||
      userData.user?.email?.split("@")[0] ||
      "A contractor",
  };
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
