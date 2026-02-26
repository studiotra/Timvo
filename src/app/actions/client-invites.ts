"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { randomBytes } from "crypto";

const INVITE_EXPIRY_DAYS = 7;

/** Public: fetch invite details by token (for accept-invite page). Returns null if invalid. */
export async function getInviteByToken(
  token: string
): Promise<{ email: string; clientName: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("client_invites")
    .select("email, client_id")
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  if (!data) return null;

  const { data: client } = await admin
    .from("clients")
    .select("name")
    .eq("id", data.client_id)
    .single();

  return { email: data.email, clientName: (client as { name?: string } | null)?.name ?? "Client" };
}

/**
 * Create a pre-confirmed user for an invited client. Skips Supabase's confirmation email
 * (which by default only sends to Supabase org members). The invite token proves the
 * client has access to this email.
 */
export async function createInvitedUser(
  token: string,
  email: string,
  password: string
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Verify token and email match
  const { data } = await admin
    .from("client_invites")
    .select("email")
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  if (!data) return { error: "Invalid or expired invite" };
  if (data.email.toLowerCase() !== email.trim().toLowerCase()) {
    return { error: "Email does not match invite" };
  }

  const trimmedEmail = email.trim().toLowerCase();
  const { data: createdUser, error } = await admin.auth.admin.createUser({
    email: trimmedEmail,
    password,
    email_confirm: true, // Skip confirmation email — invite proves email access
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("already been registered") || msg.includes("already exists") || msg.includes("duplicate")) {
      // User exists (e.g. from old signUp flow or retry). Update their password so they can sign in.
      const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = listData?.users?.find((u) => u.email?.toLowerCase() === trimmedEmail);
      if (existing) {
        const { error: updateErr } = await admin.auth.admin.updateUserById(existing.id, { password });
        if (updateErr) return { error: updateErr.message };
        return {};
      }
      return { error: "An account with this email exists. Please sign in or use 'Forgot password' on the login page." };
    }
    return { error: error.message };
  }

  // New user created — delay so Auth can propagate before client signIn
  if (createdUser?.user) {
    await new Promise((r) => setTimeout(r, 1800));
  }
  return {};
}

/** Call after signup to link user to client. Requires auth (cookies or accessToken). */
export async function acceptInvite(
  token: string,
  options?: { accessToken?: string; refreshToken?: string }
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { error: "Server misconfigured" };

  // When tokens are passed, call RPC via fetch with explicit Authorization header.
  // This avoids cookie/session timing issues in server actions.
  if (options?.accessToken) {
    const res = await fetch(`${url}/rest/v1/rpc/accept_client_invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "Authorization": `Bearer ${options.accessToken}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ invite_token: token }),
    });
    const raw = await res.json();
    if (!res.ok) return { error: raw.message ?? raw.error_description ?? "RPC failed" };
    const result = Array.isArray(raw) ? raw[0] : raw;
    const err = result?.error;
    if (err) return { error: err };
    return { success: true, clientId: result?.client_id };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase.rpc("accept_client_invite", {
    invite_token: token,
  });

  if (error) return { error: error.message };
  const result = data as { error?: string; success?: boolean; client_id?: string };
  if (result?.error) return { error: result.error };
  return { success: true, clientId: result?.client_id };
}

export type ClientInviteRow = {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
};

export async function getClientInvites(clientId: string): Promise<ClientInviteRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("client_invites")
    .select("id, email, status, expires_at, created_at")
    .eq("client_id", clientId)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });

  if (!data) return [];
  return data.map((r) => ({
    id: r.id,
    email: r.email,
    status: r.status,
    expires_at: r.expires_at,
    created_at: r.created_at,
  }));
}

export async function inviteClientToPortal(clientId: string, email: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const emailTrimmed = email.trim().toLowerCase();
  if (!emailTrimmed) return { error: "Email is required" };

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, user_id")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();

  if (!client) return { error: "Client not found" };

  const { data: existing } = await supabase
    .from("client_invites")
    .select("id")
    .eq("client_id", clientId)
    .eq("email", emailTrimmed)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existing) return { error: "An invite was already sent to this email" };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const { error: insertErr } = await supabase.from("client_invites").insert({
    client_id: clientId,
    email: emailTrimmed,
    token,
    status: "pending",
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (insertErr) return { error: insertErr.message };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!resendKey?.trim()) {
    revalidatePath(`/clients/${clientId}`);
    return { error: "Email not configured. Add RESEND_API_KEY and EMAIL_FROM to .env.local." };
  }

  const resend = new Resend(resendKey);
  const { error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: emailTrimmed,
    subject: `You're invited to view time records for ${client.name}`,
    html: `
      <p>Hi there,</p>
      <p>You've been invited to view time records for <strong>${client.name}</strong>.</p>
      <p>Click below to create your password and access the client portal:</p>
      <p>
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Set up account</a>
      </p>
      <p style="color:#6b7280;font-size:14px;">This link expires in ${INVITE_EXPIRY_DAYS} days.</p>
      <p>— Timvo</p>
    `,
  });

  if (sendError) {
    console.error("Resend error:", sendError);
    const msg = sendError.message ?? String(sendError);
    if (msg.includes("domain") || msg.includes("from") || msg.includes("validation")) {
      return { error: `Email failed: ${msg}. Verify RESEND_API_KEY and EMAIL_FROM. Resend free tier: send only to your account or add domain at resend.com/domains` };
    }
    return { error: `Failed to send email: ${msg}` };
  }

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function revokeClientInvite(inviteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: inv } = await supabase
    .from("client_invites")
    .select("id, client_id, status")
    .eq("id", inviteId)
    .single();

  if (!inv) return { error: "Invite not found" };
  if (inv.status !== "pending") return { error: "Invite already used or revoked" };

  const { data: client } = await supabase
    .from("clients")
    .select("user_id")
    .eq("id", inv.client_id)
    .single();

  if (!client || client.user_id !== user.id) return { error: "Unauthorized" };

  await supabase
    .from("client_invites")
    .update({ status: "expired" })
    .eq("id", inviteId);

  revalidatePath(`/clients/${inv.client_id}`);
  return { success: true };
}

export async function resendClientInvite(inviteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: inv } = await supabase
    .from("client_invites")
    .select("id, client_id, email, token, status")
    .eq("id", inviteId)
    .single();

  if (!inv) return { error: "Invite not found" };
  if (inv.status !== "pending") return { error: "Cannot resend used or expired invite" };

  const { data: client } = await supabase
    .from("clients")
    .select("user_id, name")
    .eq("id", inv.client_id)
    .single();

  if (!client || client.user_id !== user.id) return { error: "Unauthorized" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/accept-invite?token=${inv.token}`;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!resendKey?.trim()) return { error: "Email not configured" };

  const resend = new Resend(resendKey);
  const { error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: inv.email,
    subject: `Reminder: You're invited to view time records for ${client.name}`,
    html: `
      <p>Hi there,</p>
      <p>This is a reminder that you're invited to view time records for <strong>${client.name}</strong>.</p>
      <p>
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Set up account</a>
      </p>
      <p>— Timvo</p>
    `,
  });

  if (sendError) {
    console.error("Resend error:", sendError);
    return { error: `Failed to send email: ${sendError.message ?? "Unknown error"}` };
  }

  revalidatePath(`/clients/${inv.client_id}`);
  return { success: true };
}
