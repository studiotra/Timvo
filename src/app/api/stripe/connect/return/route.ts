import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createConnectAccountLink,
  stripeClient,
  syncConnectAccountStatus,
} from "@/lib/stripe/connect";
import { getAppBaseUrl } from "@/lib/app-url";

async function refreshUserConnectStatus(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", userId)
    .single();

  const accountId = profile?.stripe_account_id;
  if (!accountId) return false;

  const stripe = stripeClient();
  if (!stripe) return false;

  const { chargesEnabled, onboardingComplete } = await syncConnectAccountStatus(
    stripe,
    accountId
  );

  await admin
    .from("profiles")
    .update({
      stripe_connect_charges_enabled: chargesEnabled,
      stripe_connect_onboarding_complete: onboardingComplete,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return chargesEnabled;
}

export async function GET() {
  const base = getAppBaseUrl();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/login`);

  try {
    const ok = await refreshUserConnectStatus(user.id);
    return NextResponse.redirect(`${base}/settings?stripe=${ok ? "connected" : "pending"}`);
  } catch (e) {
    console.error("Stripe connect return:", e);
    return NextResponse.redirect(`${base}/settings?stripe=error`);
  }
}
