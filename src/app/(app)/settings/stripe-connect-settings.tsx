"use client";

import { useState } from "react";
import { disconnectStripeConnect, refreshStripeConnectStatus } from "@/app/actions/stripe-connect";

type Profile = {
  stripe_account_id: string | null;
  stripe_connect_charges_enabled: boolean | null;
  stripe_connect_onboarding_complete: boolean | null;
  subscription_tier: string | null;
};

export function StripeConnectSettings({
  profile,
  configured,
  flash,
}: {
  profile: Profile | null;
  configured: boolean;
  flash?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = Boolean(profile?.stripe_connect_charges_enabled);
  const pending = Boolean(profile?.stripe_account_id && !connected);
  const tier = profile?.subscription_tier ?? "free";
  const canAcceptPayments = tier === "solo" || tier === "team";

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    const result = await disconnectStripeConnect();
    setBusy(false);
    if (result?.error) setError(result.error);
    else window.location.href = "/settings";
  }

  async function handleRefresh() {
    setBusy(true);
    setError(null);
    const result = await refreshStripeConnectStatus();
    setBusy(false);
    if (result?.error) setError(result.error);
    else window.location.href = "/settings";
  }

  return (
    <section>
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Stripe payments
      </div>
      <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <p className="text-[13px] text-[var(--text-secondary)]">
          Connect Stripe to accept online payments on invoices. Client payments go directly to your
          Stripe account.
        </p>
        {flash === "connected" && (
          <p className="text-sm text-emerald-400">Stripe connected — you can accept online payments.</p>
        )}
        {flash === "pending" && (
          <p className="text-sm text-amber-400">Stripe setup incomplete — finish onboarding in Stripe.</p>
        )}
        {flash === "error" && (
          <p className="text-sm text-red-400">Couldn&apos;t connect Stripe. Try again.</p>
        )}
        {flash === "not_configured" && (
          <p className="text-sm text-red-400">Add STRIPE_SECRET_KEY to enable Stripe Connect.</p>
        )}
        {flash === "connect_not_enabled" && (
          <p className="text-sm text-red-400">
            Enable Stripe Connect on your platform Stripe account (Dashboard → Connect → Get started),
            then try again.
          </p>
        )}
        {flash === "schema" && (
          <p className="text-sm text-red-400">
            Database migration missing — run{" "}
            <code className="text-[12px]">20250831110000_stripe_connect.sql</code> in Supabase, then
            retry.
          </p>
        )}
        {!canAcceptPayments && (
          <p className="rounded-lg bg-indigo-500/10 px-3 py-2 text-[12px] text-indigo-200/90">
            Online payments require a Solo or Team plan. You can still send invoices by email without
            a pay link.
          </p>
        )}
        {connected ? (
          <>
            <p className="text-[13px] font-medium text-[var(--text-primary)]">
              Stripe connected · {tier.charAt(0).toUpperCase() + tier.slice(1)} plan
            </p>
            <p className="text-[12px] text-[var(--text-muted)]">
              Pay links on sent invoices deposit to your connected Stripe account.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={busy}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-[13px] font-medium hover:bg-[var(--row-hover)] disabled:opacity-50"
              >
                Refresh status
              </button>
              <button
                type="button"
                onClick={() => void handleDisconnect()}
                disabled={busy}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-[13px] font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          </>
        ) : pending ? (
          <>
            <p className="text-[13px] text-amber-400">Setup in progress — complete Stripe onboarding.</p>
            <a
              href="/api/stripe/connect/start"
              className="inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-400"
            >
              Continue setup
            </a>
          </>
        ) : (
          <a
            href={configured && canAcceptPayments ? "/api/stripe/connect/start" : undefined}
            className={`inline-flex rounded-lg px-4 py-2 text-[13px] font-semibold text-white ${
              configured && canAcceptPayments
                ? "bg-indigo-500 hover:bg-indigo-400"
                : "pointer-events-none bg-gray-500 opacity-50"
            }`}
          >
            Connect Stripe
          </a>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </section>
  );
}
