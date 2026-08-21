"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrganizationProfile } from "@/app/actions/organizations";

export function OrgProfileSettings({
  name,
  slug,
  canEdit,
}: {
  name: string;
  slug: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [orgName, setOrgName] = useState(name);
  const [orgSlug, setOrgSlug] = useState(slug ?? "");
  const [busy, setBusy] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true);
    const result = await updateOrganizationProfile({ name: orgName, slug: orgSlug });
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Organization updated");
      router.refresh();
    }
  }

  return (
    <section>
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Organization
      </div>
      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
      >
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Name
          </label>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            disabled={!canEdit}
            required
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Slug
          </label>
          <input
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value)}
            disabled={!canEdit}
            placeholder="agency-name"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] disabled:opacity-60"
          />
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Used for internal identification. Letters, numbers, and hyphens only.
          </p>
        </div>
        {canEdit ? (
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save organization"}
          </button>
        ) : (
          <p className="text-[12px] text-[var(--text-muted)]">
            Only managers can edit organization details.
          </p>
        )}
      </form>
    </section>
  );
}
