import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export type DesktopUser = {
  id: string;
  email: string | null;
};

/**
 * Authenticate desktop / mobile clients via Authorization: Bearer <access_token>.
 */
export async function getDesktopUser(
  req: NextRequest
): Promise<{ user: DesktopUser; accessToken: string } | { error: string; status: number }> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return { error: "Missing bearer token", status: 401 };
  }
  const accessToken = header.slice(7).trim();
  if (!accessToken) return { error: "Missing bearer token", status: 401 };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { error: "Server misconfigured", status: 500 };

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return { error: "Invalid or expired session", status: 401 };
  }

  return {
    user: { id: data.user.id, email: data.user.email ?? null },
    accessToken,
  };
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function jsonOk(data: unknown, status = 200) {
  return Response.json(data, { status });
}
