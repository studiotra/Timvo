import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  createConnectAccountLink,
  createExpressAccount,
  stripeClient,
  stripeConnectConfigured,
} from "@/lib/stripe/connect";

function stripeErrorParam(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : "";

  if (/signed up for connect/i.test(message)) return "connect_not_enabled";
  if (/invalid api key/i.test(message)) return "not_configured";
  return "error";
}

export async function GET(_req: NextRequest) {
  const base = getAppBaseUrl();

  if (!stripeConnectConfigured()) {
    return NextResponse.redirect(`${base}/settings?stripe=not_configured`);
  }

  const stripe = stripeClient();
  if (!stripe) {
    return NextResponse.redirect(`${base}/settings?stripe=not_configured`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${base}/login`);
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_account_id, business_name, full_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Stripe connect start — profile fetch:", profileError);
      if (/stripe_account_id|column/i.test(profileError.message)) {
        return NextResponse.redirect(`${base}/settings?stripe=schema`);
      }
      return NextResponse.redirect(`${base}/settings?stripe=error`);
    }

    let accountId = profile?.stripe_account_id ?? null;
    if (!accountId) {
      const account = await createExpressAccount(stripe, {
        email: user.email ?? "",
        businessName: profile?.business_name ?? profile?.full_name,
      });
      accountId = account.id;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          stripe_account_id: accountId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Stripe connect start — save account id:", updateError);
        if (/stripe_account_id|column/i.test(updateError.message)) {
          return NextResponse.redirect(`${base}/settings?stripe=schema`);
        }
        return NextResponse.redirect(`${base}/settings?stripe=error`);
      }
    }

    const link = await createConnectAccountLink(stripe, accountId);
    return NextResponse.redirect(link.url);
  } catch (error) {
    console.error("Stripe connect start:", error);
    return NextResponse.redirect(`${base}/settings?stripe=${stripeErrorParam(error)}`);
  }
}
