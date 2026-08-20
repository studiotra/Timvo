"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  revokeProjectShare,
  shareProjectWithOrg,
  type ProjectShareStatus,
} from "@/app/actions/project-shares";
import type { ContractorOrgOption } from "@/app/actions/organizations";

export function ShareProjectToOrgButton({
  projectId,
  organizations,
  existingShares = [],
}: {
  projectId: string;
  organizations: ContractorOrgOption[];
  existingShares?: ProjectShareStatus[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orgId, setOrgId] = useState(organizations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  if (organizations.length === 0) return null;

  const active = existingShares.filter((s) => s.status === "active");

  async function handleShare() {
    if (!orgId) return;
    setBusy(true);
    const result = await shareProjectWithOrg(projectId, orgId);
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Project shared with agency");
      setOpen(false);
      router.refresh();
    }
  }

  async function handleRevoke(organizationId: string) {
    setBusy(true);
    const result = await revokeProjectShare(projectId, organizationId);
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Share revoked");
      router.refresh();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:border-violet-500/50 hover:text-violet-400"
      >
        {active.length ? `Shared (${active.length})` : "Share to agency"}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-xl">
          <p className="mb-2 text-xs font-semibold text-[var(--text-primary)]">
            Share project tracking with agency
          </p>
          {active.length > 0 && (
            <ul className="mb-3 space-y-1">
              {active.map((s) => (
                <li
                  key={s.shareId}
                  className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]"
                >
                  <span>{s.organizationName}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRevoke(s.organizationId)}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-xs"
            >
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !orgId}
              onClick={handleShare}
              className="rounded-lg bg-violet-600 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
