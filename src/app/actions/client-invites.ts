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
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("client_invites")
    .select("email, client_id")
    .eq("token", token)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  if (!data) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("name")
    .eq("id", data.client_id)
    .single();

  return { email: data.email, clientName: (client as { name?: string } | null)?.name ?? "Client" };
}

/** Call after signup to link user to client. Requires auth. */
export async function acceptInvite(token: string) {
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

  // Validate user owns the client
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, user_id")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();

  if (!client) return { error: "Client not found" };

  // Check for existing pending invite to same email
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

  // Send email
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
      <p>Click below to set up your account and access the client portal:</p>
      <p>
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Set up account</a>
      </p>
      <p style="color:#6b7280;font-size:14px;">This link expires in ${INVITE_EXPIRY_DAYS} days.</p>
      <p>— Timvo</p>
    `,
  });

  if (sendError) {
    console.error("Resend error:", sendError);
    const msg = sendError.message ?? "Failed to send email";
    if (msg.includes("domain") || msg.includes("from") || msg.includes("validation")) {
      return { error: `Email failed: ${msg}. Resend allows sending only to your account email or delivered@resend.dev until you verify a domain. See resend.com/domains` };
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
