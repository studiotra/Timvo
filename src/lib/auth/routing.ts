import type { SupabaseClient } from "@supabase/supabase-js";

export function isContractorAppRoute(path: string): boolean {
  return !(
    path.startsWith("/client") ||
    path.startsWith("/org") ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/auth") ||
    path.startsWith("/accept-invite") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/client-preview") ||
    path.startsWith("/api")
  );
}

export function isOrgAppRoute(path: string): boolean {
  return path.startsWith("/org");
}

export async function getPendingInvitePath(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: pendingInv } = await supabase.rpc("get_my_pending_invite");
  const token = (pendingInv as { token?: string } | null)?.token;
  if (!token) return null;
  return `/accept-invite?token=${encodeURIComponent(token)}`;
}

/** True only when the user has portal access and no contractor/org business role. */
export async function isPortalOnlyUser(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  if (await isOrganizationMember(supabase, userId)) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.account_type === "contractor" || profile?.account_type === "organization") {
    return false;
  }

  const [{ data: portalAccess }, { data: ownedClient }] = await Promise.all([
    supabase
      .from("client_portal_access")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .is("organization_id", null)
      .limit(1)
      .maybeSingle(),
  ]);

  return Boolean(portalAccess) && !ownedClient;
}

export async function isOrganizationMember(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export async function isOrganizationPrimaryUser(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.account_type === "organization") return true;
  const isMember = await isOrganizationMember(supabase, userId);
  if (!isMember) return false;
  const { data: soloClient } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .is("organization_id", null)
    .limit(1)
    .maybeSingle();
  return !soloClient;
}

/**
 * Home after login.
 * Priority: pending invite → agency → contractor business → portal-only → contractor.
 * Portal never wins over contractor/org membership.
 */
export async function resolveHomePath(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const pending = await getPendingInvitePath(supabase);
  if (pending) return pending;
  if (await isOrganizationPrimaryUser(supabase, userId)) return "/org";
  if (await isOrganizationMember(supabase, userId)) return "/org";

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.account_type === "contractor") return "/";

  const { data: ownedClient } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .is("organization_id", null)
    .limit(1)
    .maybeSingle();
  if (ownedClient) return "/";

  if (await isPortalOnlyUser(supabase, userId)) return "/client";
  return "/";
}

export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function getPrimaryOrganizationId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.organization_id ?? null;
}
