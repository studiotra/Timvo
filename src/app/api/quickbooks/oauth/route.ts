import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  appBaseUrl,
  buildAuthorizeUrl,
  canUseQuickBooks,
  quickbooksConfigured,
  signOAuthState,
} from "@/lib/quickbooks/oauth";

function safeNext(path: string | null): string {
  if (path === "/org/settings" || path === "/settings") return path;
  return "/settings";
}

export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (!quickbooksConfigured()) {
    return NextResponse.redirect(`${appBaseUrl()}${next}?quickbooks=not_configured`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${appBaseUrl()}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (!canUseQuickBooks(profile)) {
    return NextResponse.redirect(`${appBaseUrl()}${next}?quickbooks=upgrade`);
  }

  const state = await signOAuthState(user.id, next);
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
