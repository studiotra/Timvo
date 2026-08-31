import Stripe from "stripe";
import { getAppBaseUrl } from "@/lib/app-url";

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

export function stripeConnectConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export type ConnectProfile = {
  stripe_account_id: string | null;
  stripe_connect_charges_enabled: boolean | null;
  stripe_connect_onboarding_complete: boolean | null;
  subscription_tier: string | null;
};

export async function createExpressAccount(
  stripe: Stripe,
  params: { email: string; businessName?: string | null }
) {
  return stripe.accounts.create({
    type: "express",
    email: params.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: params.businessName
      ? { name: params.businessName }
      : undefined,
  });
}

export async function createConnectAccountLink(stripe: Stripe, accountId: string) {
  const base = getAppBaseUrl();
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/api/stripe/connect/refresh`,
    return_url: `${base}/api/stripe/connect/return`,
    type: "account_onboarding",
  });
}

export async function syncConnectAccountStatus(stripe: Stripe, accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  const chargesEnabled = Boolean(account.charges_enabled);
  const onboardingComplete = Boolean(account.details_submitted);
  return { chargesEnabled, onboardingComplete, account };
}

export function canAcceptOnlinePayments(profile: ConnectProfile | null): boolean {
  if (!profile) return false;
  return Boolean(profile.stripe_account_id && profile.stripe_connect_charges_enabled);
}

/** Solo+ required for Stripe payment links (set STRIPE_PAYMENTS_DEV_MODE=true to bypass in dev). */
export function canUseInvoicePayments(profile: ConnectProfile | null): boolean {
  if (process.env.STRIPE_PAYMENTS_DEV_MODE === "true") return true;
  const tier = profile?.subscription_tier ?? "free";
  return tier === "solo" || tier === "team";
}

export function toCents(amount: number, currency: string) {
  const zeroDecimal = ["jpy", "krw", "vnd"].includes(currency.toLowerCase());
  return zeroDecimal ? Math.round(amount) : Math.round(amount * 100);
}

export type CheckoutLineItem = {
  description: string;
  amount: number;
};

export async function createInvoiceCheckoutSession(params: {
  stripe: Stripe;
  connectedAccountId?: string | null;
  invoiceId: string;
  currency: string;
  lineItems: CheckoutLineItem[];
  taxAmount: number;
  taxLabel?: string;
  totalWithTax: number;
  clientEmail: string;
  clientName?: string;
  publicInvoiceUrl: string;
}) {
  const currency = params.currency.toLowerCase();
  const toUnit = (n: number) => toCents(n, currency);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    params.lineItems.length > 0
      ? [
          ...params.lineItems.map((i) => ({
            price_data: {
              currency,
              unit_amount: toUnit(i.amount),
              product_data: { name: i.description || "Line item" },
            },
            quantity: 1,
          })),
          ...(params.taxAmount > 0
            ? [
                {
                  price_data: {
                    currency,
                    unit_amount: toUnit(params.taxAmount),
                    product_data: { name: params.taxLabel ?? "Tax" },
                  },
                  quantity: 1,
                },
              ]
            : []),
        ]
      : [
          {
            price_data: {
              currency,
              unit_amount: toUnit(params.totalWithTax),
              product_data: {
                name: `Invoice #${params.invoiceId.slice(0, 8)} — ${params.clientName ?? "Invoice"}`,
              },
            },
            quantity: 1,
          },
        ];

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: lineItems,
    metadata: { invoice_id: params.invoiceId },
    success_url: `${params.publicInvoiceUrl}?paid=1`,
    cancel_url: params.publicInvoiceUrl,
    customer_email: params.clientEmail,
  };

  if (params.connectedAccountId) {
    return params.stripe.checkout.sessions.create(sessionParams, {
      stripeAccount: params.connectedAccountId,
    });
  }

  return params.stripe.checkout.sessions.create(sessionParams);
}
