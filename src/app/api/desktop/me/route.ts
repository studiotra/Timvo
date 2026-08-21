import { NextRequest } from "next/server";
import { getDesktopUser, jsonError } from "@/lib/desktop/auth";
import { optionsResponse, withCors } from "@/lib/desktop/cors";
import { createAdminClient } from "@/lib/supabase/admin";

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export async function GET(req: NextRequest) {
  const auth = await getDesktopUser(req);
  if ("error" in auth) return withCors(req, jsonError(auth.error, auth.status));

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, business_name, account_type")
    .eq("id", auth.user.id)
    .maybeSingle();

  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle();

  const org = membership?.organizations as unknown as { name: string } | null;

  return withCors(
    req,
    Response.json({
      user: {
        id: auth.user.id,
        email: auth.user.email,
        fullName: profile?.full_name ?? null,
        businessName: profile?.business_name ?? null,
        accountType: profile?.account_type ?? null,
      },
      organization: membership
        ? {
            id: membership.organization_id,
            name: org?.name ?? null,
            role: membership.role,
          }
        : null,
    })
  );
}
