"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { publishOrgSharesToViewer } from "@/app/actions/viewer-shares";
import type { ViewerClientOption } from "@/app/actions/viewer-shares";
import type { TimeLogShareRow } from "@/app/actions/org-timesheets";

export function PublishToViewerPanel({
  approved,
  viewerClients,
}: {
  approved: TimeLogShareRow[];
  viewerClients: ViewerClientOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [clientId, setClientId] = useState(viewerClients[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  if (approved.length === 0 || viewerClients.length === 0) return null;

  async function handlePublish() {
    if (!clientId || selected.length === 0) {
      toast.error("Select submissions and an end client");
      return;
    }
    setBusy(true);
    const result = await publishOrgSharesToViewer(selected, clientId);
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Published ${result.published} log(s) to client portal`);
      setSelected([]);
      router.refresh();
    }
  }

  return (
    <div className="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
        Publish approved time to viewer portal
      </h2>
      <p className="mb-3 text-xs text-[var(--text-secondary)]">
        End clients only see published hours on their portal.
      </p>
      <div className="mb-3 max-h-40 overflow-y-auto space-y-1">
        {approved.map((row) => (
          <label key={row.shareId} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(row.shareId)}
              onChange={(e) =>
                setSelected((prev) =>
                  e.target.checked
                    ? [...prev, row.shareId]
                    : prev.filter((id) => id !== row.shareId)
                )
              }
            />
            <span className="text-[var(--text-secondary)]">
              {row.contractorEmail} · {row.projectName} · {row.durationMinutes}m
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-sm"
        >
          {viewerClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={handlePublish}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Publishing…" : "Publish to viewer"}
        </button>
      </div>
    </div>
  );
}
