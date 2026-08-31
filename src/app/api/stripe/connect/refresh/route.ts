import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createConnectAccountLink,
  stripeClient,
} from "@/lib/stripe/connect";
import { getAppBaseUrl } from "@/lib/app-url";

export async function GET() {
  const base = getAppBaseUrl();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/login`);

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    const stripe = stripeClient();
    if (!stripe || !profile?.stripe_account_id) {
      return NextResponse.redirect(`${base}/settings?stripe=error`);
    }

    const link = await createConnectAccountLink(stripe, profile.stripe_account_id);
    return NextResponse.redirect(link.url);
  } catch (error) {
    console.error("Stripe connect refresh:", error);
    return NextResponse.redirect(`${base}/settings?stripe=error`);
  }
}
