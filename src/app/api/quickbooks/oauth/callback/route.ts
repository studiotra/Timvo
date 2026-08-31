import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  appBaseUrl,
  exchangeCodeForTokens,
  quickbooksConfigured,
  readOAuthState,
  tokensFromResponse,
} from "@/lib/quickbooks/oauth";
import { getCompanyName, getValidConnection } from "@/lib/quickbooks/sync";

export async function GET(req: NextRequest) {
  const base = appBaseUrl();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const realmId = req.nextUrl.searchParams.get("realmId");
  const parsed = await readOAuthState(state);
  const next = parsed?.next ?? "/settings";

  if (!code || !realmId || !parsed?.userId) {
    return NextResponse.redirect(`${base}${next}?quickbooks=error`);
  }

  if (!quickbooksConfigured()) {
    return NextResponse.redirect(`${base}${next}?quickbooks=not_configured`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const tokenFields = tokensFromResponse(tokens);
    const supabase = createAdminClient();

    const row = {
      user_id: parsed.userId,
      realm_id: realmId,
      company_name: null as string | null,
      ...tokenFields,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("quickbooks_connections").upsert(row, {
      onConflict: "user_id",
    });

    if (error) {
      return NextResponse.redirect(`${base}${next}?quickbooks=error`);
    }

    const conn = await getValidConnection(parsed.userId);
    if (conn) {
      const companyName = await getCompanyName(conn);
      if (companyName) {
        await supabase
          .from("quickbooks_connections")
          .update({ company_name: companyName, updated_at: new Date().toISOString() })
          .eq("user_id", parsed.userId);
      }
    }

    return NextResponse.redirect(`${base}${next}?quickbooks=connected`);
  } catch (e) {
    console.error("QuickBooks OAuth callback:", e);
    return NextResponse.redirect(`${base}${next}?quickbooks=error`);
  }
}
