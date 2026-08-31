"use client";

import { useState } from "react";
import { disconnectQuickBooks } from "@/app/actions/quickbooks";

type Connection = {
  company_name: string | null;
  realm_id: string;
};

export function QuickBooksSettings({
  connection,
  configured,
  flash,
  subscriptionTier,
  returnPath = "/settings",
}: {
  connection: Connection | null;
  configured: boolean;
  flash?: string | null;
  subscriptionTier?: string | null;
  returnPath?: string;
}) {
  const status = flash ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canConnect = (subscriptionTier ?? "free") === "team";

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    const result = await disconnectQuickBooks();
    setBusy(false);
    if (result?.error) setError(result.error);
    else window.location.href = returnPath;
  }

  const oauthHref =
    returnPath === "/org/settings"
      ? "/api/quickbooks/oauth?next=/org/settings"
      : "/api/quickbooks/oauth";

  return (
    <section>
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        QuickBooks
      </div>
      <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <p className="text-[13px] text-[var(--text-secondary)]">
          Connect QuickBooks Online to sync sent invoices and record Stripe payments automatically
          when clients pay online.
        </p>
        {status === "connected" && (
          <p className="text-sm text-emerald-400">
            QuickBooks connected. Invoices and Stripe payments will sync to your books.
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-400">Couldn&apos;t connect QuickBooks. Try again.</p>
        )}
        {status === "not_configured" && (
          <p className="text-sm text-red-400">
            QuickBooks env vars are missing. Add QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET.
          </p>
        )}
        {status === "upgrade" && (
          <p className="text-sm text-red-400">
            QuickBooks sync requires a Team plan. Upgrade to connect QuickBooks Online.
          </p>
        )}
        {!canConnect && !connection && (
          <p className="rounded-lg bg-indigo-500/10 px-3 py-2 text-[12px] text-indigo-200/90">
            QuickBooks Online sync is available on the Team plan—for agencies syncing invoices and
            Stripe payments to their books.
          </p>
        )}
        {connection ? (
          <>
            <p className="text-[13px] text-[var(--text-primary)]">
              Connected to {connection.company_name || "QuickBooks company"}
            </p>
            <p className="text-[12px] text-[var(--text-muted)]">
              On send → invoice created in QBO. On Stripe payment → payment applied to that invoice.
            </p>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={busy}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--row-hover)] disabled:opacity-50"
            >
              {busy ? "Disconnecting…" : "Disconnect QuickBooks"}
            </button>
          </>
        ) : (
          <a
            href={canConnect ? oauthHref : undefined}
            className={`inline-flex rounded-lg px-4 py-2 text-[13px] font-semibold text-white ${
              configured && canConnect
                ? "bg-[#2ca01c] hover:bg-[#248517]"
                : "pointer-events-none bg-gray-500 opacity-50"
            }`}
          >
            Connect QuickBooks
          </a>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </section>
  );
}
