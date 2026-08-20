"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  acknowledgeOrgLink,
  leaveOrganization,
  type UnacknowledgedOrgLink,
} from "@/app/actions/organizations";

export function OrgLinkBanner({ links }: { links: UnacknowledgedOrgLink[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!links.length) return null;

  async function dismiss(linkId: string) {
    setBusyId(linkId);
    const result = await acknowledgeOrgLink(linkId);
    setBusyId(null);
    if (result.error) toast.error(result.error);
    else router.refresh();
  }

  async function leave(organizationId: string, linkId: string) {
    setBusyId(linkId);
    const result = await leaveOrganization(organizationId);
    setBusyId(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Unlinked from organization");
      router.refresh();
    }
  }

  return (
    <div className="mb-4 space-y-2">
      {links.map((link) => {
        const busy = busyId === link.linkId;
        return (
          <div
            key={link.linkId}
            className="flex flex-col gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-[var(--text-primary)]">
              <strong>{link.organizationName}</strong> linked your account. You can submit
              time and share projects with them.
            </p>
            <div className="flex flex-shrink-0 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => leave(link.organizationId, link.linkId)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--row-hover)] disabled:opacity-50"
              >
                Unlink
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => dismiss(link.linkId)}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Got it
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
