"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeClient, syncConnectAccountStatus } from "@/lib/stripe/connect";

export async function disconnectStripeConnect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  const stripe = stripeClient();
  if (stripe && profile?.stripe_account_id) {
    try {
      await stripe.accounts.del(profile.stripe_account_id);
    } catch {
      // Account may already be deleted in Stripe dashboard
    }
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      stripe_account_id: null,
      stripe_connect_charges_enabled: false,
      stripe_connect_onboarding_complete: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function refreshStripeConnectStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_account_id) return { error: "No Stripe account" };

  const stripe = stripeClient();
  if (!stripe) return { error: "Stripe not configured" };

  const { chargesEnabled, onboardingComplete } = await syncConnectAccountStatus(
    stripe,
    profile.stripe_account_id
  );

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      stripe_connect_charges_enabled: chargesEnabled,
      stripe_connect_onboarding_complete: onboardingComplete,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  revalidatePath("/settings");
  return { success: true, chargesEnabled, onboardingComplete };
}
