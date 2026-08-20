"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  inviteContractorByEmail,
  unlinkContractor,
  type OrgContractorRow,
} from "@/app/actions/organizations";

export function OrgContractorsContent({
  contractors,
}: {
  contractors: OrgContractorRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await inviteContractorByEmail(email);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.emailWarning) toast.message(result.emailWarning);
    else toast.success("Contractor linked — notification email sent");
    setEmail("");
    router.refresh();
  }

  async function handleRemove(linkId: string) {
    setUnlinkingId(linkId);
    const result = await unlinkContractor(linkId);
    setUnlinkingId(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Contractor removed");
      router.refresh();
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Contractors</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Link Timvo contractor accounts so they can submit time to your organization. They&apos;ll
        get an email and an in-app notice.
      </p>

      <form
        onSubmit={handleInvite}
        className="mb-8 flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:flex-row"
      >
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="contractor@email.com"
          required
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Linking…" : "Link contractor"}
        </button>
      </form>

      {contractors.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center text-[var(--text-muted)]">
          No contractors linked yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {contractors.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"
            >
              <div className="min-w-0">
                <span className="block truncate text-sm text-[var(--text-primary)]">{c.email}</span>
                <span className="text-xs capitalize text-[var(--text-muted)]">{c.status}</span>
              </div>
              <button
                type="button"
                disabled={unlinkingId === c.id}
                onClick={() => handleRemove(c.id)}
                className="flex-shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                {unlinkingId === c.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
