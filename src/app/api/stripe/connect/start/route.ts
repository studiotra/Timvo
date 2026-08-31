import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  createConnectAccountLink,
  createExpressAccount,
  stripeClient,
  stripeConnectConfigured,
} from "@/lib/stripe/connect";

export async function GET(_req: NextRequest) {
  if (!stripeConnectConfigured()) {
    return NextResponse.redirect(`${getAppBaseUrl()}/settings?stripe=not_configured`);
  }

  const stripe = stripeClient();
  if (!stripe) {
    return NextResponse.redirect(`${getAppBaseUrl()}/settings?stripe=not_configured`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${getAppBaseUrl()}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id, business_name, full_name")
    .eq("id", user.id)
    .single();

  let accountId = profile?.stripe_account_id ?? null;
  if (!accountId) {
    const account = await createExpressAccount(stripe, {
      email: user.email ?? "",
      businessName: profile?.business_name ?? profile?.full_name,
    });
    accountId = account.id;
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({
        stripe_account_id: accountId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  const link = await createConnectAccountLink(stripe, accountId);
  return NextResponse.redirect(link.url);
}
