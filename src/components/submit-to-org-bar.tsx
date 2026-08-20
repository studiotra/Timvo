"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitTimeLogsToOrg } from "@/app/actions/org-timesheets";
import { type ContractorOrgOption } from "@/app/actions/organizations";

export function SubmitToOrgBar({
  organizations,
  selectedLogIds,
  onClearSelection,
}: {
  organizations: ContractorOrgOption[];
  selectedLogIds: string[];
  onClearSelection?: () => void;
}) {
  const router = useRouter();
  const [orgId, setOrgId] = useState(organizations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  if (organizations.length === 0) return null;

  async function handleSubmit() {
    if (!orgId || selectedLogIds.length === 0) {
      toast.error("Select time logs and an organization");
      return;
    }
    setBusy(true);
    const result = await submitTimeLogsToOrg(selectedLogIds, orgId);
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Submitted ${result.submitted} log(s) to organization`);
      onClearSelection?.();
      router.refresh();
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3">
      <span className="text-sm font-medium text-[var(--text-primary)]">
        Submit to organization
      </span>
      <select
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm"
      >
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy || selectedLogIds.length === 0}
        onClick={handleSubmit}
        className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy
          ? "Submitting…"
          : selectedLogIds.length
            ? `Submit ${selectedLogIds.length} selected`
            : "Select logs below"}
      </button>
      <span className="text-xs text-[var(--text-muted)]">
        Submit any of your project logs — they&apos;ll appear in the agency inbox automatically
      </span>
    </div>
  );
}
