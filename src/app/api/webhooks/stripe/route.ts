import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { syncStripePaymentToQuickBooks } from "@/lib/quickbooks/sync";
import { syncConnectAccountStatus } from "@/lib/stripe/connect";

const stripeKey = process.env.STRIPE_SECRET_KEY;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: "Missing webhook secret or signature" }, { status: 400 });
  }

  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }
  const stripe = new Stripe(stripeKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoice_id;
    if (invoiceId) {
      const supabase = createAdminClient();
      const paidAt = new Date().toISOString();
      const amount =
        session.amount_total != null ? session.amount_total / 100 : undefined;

      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: paidAt,
          stripe_session_id: session.id,
          updated_at: paidAt,
        })
        .eq("id", invoiceId);

      if (error) {
        console.error("Stripe webhook invoice update failed:", error.message);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }

      const qbo = await syncStripePaymentToQuickBooks(supabase, invoiceId, {
        amount,
        paidAt,
        stripeSessionId: session.id,
      });
      if (!qbo.ok) {
        console.error("QuickBooks payment sync failed:", qbo.error);
      }
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    if (account.id) {
      const supabase = createAdminClient();
      const { chargesEnabled, onboardingComplete } = await syncConnectAccountStatus(
        stripe,
        account.id
      );
      await supabase
        .from("profiles")
        .update({
          stripe_connect_charges_enabled: chargesEnabled,
          stripe_connect_onboarding_complete: onboardingComplete,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", account.id);
    }
  }

  return NextResponse.json({ received: true });
}
