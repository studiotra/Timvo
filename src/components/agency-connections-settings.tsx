"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  inviteAgencyByEmail,
  leaveOrganization,
  type ContractorOrgOption,
} from "@/app/actions/organizations";

export function AgencyConnectionsSettings({
  organizations,
}: {
  organizations: ContractorOrgOption[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setLastInviteUrl(null);
    const result = await inviteAgencyByEmail(email);
    setBusy(false);
    if (result.inviteUrl) setLastInviteUrl(result.inviteUrl);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Invite email sent");
    setEmail("");
    router.refresh();
  }

  async function handleLeave(organizationId: string) {
    setLeavingId(organizationId);
    const result = await leaveOrganization(organizationId);
    setLeavingId(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Unlinked from organization");
      router.refresh();
    }
  }

  async function copyInvite() {
    if (!lastInviteUrl) return;
    await navigator.clipboard.writeText(lastInviteUrl);
    toast.success("Invite link copied");
  }

  return (
    <section>
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Agencies
      </div>
      <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <p className="text-[13px] text-[var(--text-secondary)]">
          Invite an agency to Timvo. When they create an organization with the invited email,
          your contractor account is linked automatically.
        </p>

        <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="agency@email.com"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send invite"}
          </button>
        </form>

        {lastInviteUrl && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] p-3">
            <p className="mb-2 text-[12px] text-[var(--text-muted)]">Invite link</p>
            <p className="mb-2 break-all font-mono text-[11px] text-[var(--text-secondary)]">
              {lastInviteUrl}
            </p>
            <button
              type="button"
              onClick={copyInvite}
              className="text-[12px] font-semibold text-accent hover:underline"
            >
              Copy link
            </button>
          </div>
        )}

        {organizations.length > 0 && (
          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <p className="text-[12px] font-medium text-[var(--text-muted)]">Linked organizations</p>
            <ul className="space-y-2">
              {organizations.map((org) => (
                <li
                  key={org.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2"
                >
                  <span className="text-sm text-[var(--text-primary)]">{org.name}</span>
                  <button
                    type="button"
                    disabled={leavingId === org.id}
                    onClick={() => handleLeave(org.id)}
                    className="text-[12px] font-semibold text-red-400 hover:underline disabled:opacity-50"
                  >
                    {leavingId === org.id ? "Unlinking…" : "Unlink"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
