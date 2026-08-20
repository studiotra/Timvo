"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { shareTimeLogsToViewer } from "@/app/actions/viewer-shares";
import type { ViewerClientOption } from "@/app/actions/viewer-shares";

export function ShareToViewerBar({
  viewerClients,
  selectedLogIds,
  onClearSelection,
}: {
  viewerClients: ViewerClientOption[];
  selectedLogIds: string[];
  onClearSelection?: () => void;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(viewerClients[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  if (viewerClients.length === 0) return null;

  async function handleShare() {
    if (!clientId || selectedLogIds.length === 0) {
      toast.error("Select logs and a client portal");
      return;
    }
    setBusy(true);
    const result = await shareTimeLogsToViewer(selectedLogIds, clientId);
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Shared ${result.shared} log(s) with viewer`);
      onClearSelection?.();
      router.refresh();
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
      <span className="text-sm font-medium text-[var(--text-primary)]">Share with viewer</span>
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
        disabled={busy || selectedLogIds.length === 0}
        onClick={handleShare}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Sharing…" : selectedLogIds.length ? `Share ${selectedLogIds.length} selected` : "Select logs"}
      </button>
    </div>
  );
}
