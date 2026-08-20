"use client";

import { useState } from "react";
import { disconnectSlack } from "@/app/actions/slack";

type Connection = {
  slack_team_name: string | null;
  slack_user_id: string;
};

export function SlackSettings({
  connection,
  configured,
  flash,
}: {
  connection: Connection | null;
  configured: boolean;
  flash?: string | null;
}) {
  const status = flash ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    const result = await disconnectSlack();
    setBusy(false);
    if (result?.error) setError(result.error);
    else window.location.href = "/settings";
  }

  return (
    <section>
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Slack
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
        <p className="text-[13px] text-[var(--text-secondary)]">
          Start and stop your timer from Slack with{" "}
          <code className="rounded bg-[var(--bg-app)] px-1 py-0.5 font-mono text-[12px]">
            /timvo
          </code>
          .
        </p>
        {status === "connected" && (
          <p className="text-sm text-emerald-400">
            Slack connected. Check your Slack DMs for a welcome message from Timvo.
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-400">Couldn’t connect Slack. Try again.</p>
        )}
        {status === "not_configured" && (
          <p className="text-sm text-red-400">
            Slack env vars are missing. Add SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, and
            SLACK_SIGNING_SECRET.
          </p>
        )}
        {connection ? (
          <>
            <p className="text-[13px] text-[var(--text-primary)]">
              Connected to {connection.slack_team_name || "Slack"}
            </p>
            <p className="text-[12px] text-[var(--text-muted)]">
              /timvo start · /timvo status · /timvo stop. You&apos;ll get a welcome DM when
              connected, a morning nudge at 9am if you haven&apos;t tracked yet, and 1h/2h alerts
              if you forget to stop.
            </p>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={busy}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--row-hover)] disabled:opacity-50"
            >
              {busy ? "Disconnecting…" : "Disconnect Slack"}
            </button>
          </>
        ) : configured ? (
          <a
            href="/api/slack/oauth"
            className="inline-flex rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent-hover"
          >
            Connect Slack
          </a>
        ) : (
          <p className="text-[12px] text-[var(--text-muted)]">
            Slack isn’t configured on this server yet.
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </section>
  );
}
