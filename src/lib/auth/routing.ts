import type { SupabaseClient } from "@supabase/supabase-js";

export function isContractorAppRoute(path: string): boolean {
  return !(
    path.startsWith("/client") ||
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/accept-invite") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/client-preview") ||
    path.startsWith("/api")
  );
}

export async function getPendingInvitePath(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: pendingInv } = await supabase.rpc("get_my_pending_invite");
  const token = (pendingInv as { token?: string } | null)?.token;
  if (!token) return null;
  return `/accept-invite?token=${encodeURIComponent(token)}`;
}

export async function isPortalOnlyUser(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const [{ data: portalAccess }, { data: ownedClient }] = await Promise.all([
    supabase
      .from("client_portal_access")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
    supabase.from("clients").select("id").eq("user_id", userId).limit(1).maybeSingle(),
  ]);
  return Boolean(portalAccess) && !ownedClient;
}

/** Where to send a user after login. */
export async function resolveHomePath(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const pending = await getPendingInvitePath(supabase);
  if (pending) return pending;
  if (await isPortalOnlyUser(supabase, userId)) return "/client";
  return "/";
}

export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
