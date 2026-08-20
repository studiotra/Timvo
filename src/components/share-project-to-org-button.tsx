"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [orgId, setOrgId] = useState(organizations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  const active = existingShares.filter((s) => s.status === "active");

  function updatePosition() {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onReposition() {
      updatePosition();
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  if (organizations.length === 0) return null;

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
    <div className="relative z-10">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!open) updatePosition();
          setOpen((v) => !v);
        }}
        className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:border-violet-500/50 hover:text-violet-400"
      >
        {active.length ? `Shared (${active.length})` : "Share to agency"}
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: coords.top, right: coords.right }}
            className="fixed z-[100] w-72 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-xl"
          >
            <p className="mb-2 text-xs font-semibold text-[var(--text-primary)]">
              Share project with agency
            </p>
            <p className="mb-2 text-[10px] text-[var(--text-muted)]">
              Optional — submitting logs also shares the project automatically.
            </p>
            {active.length > 0 && (
              <ul className="mb-3 space-y-1">
                {active.map((s) => (
                  <li
                    key={s.shareId}
                    className="flex flex-col gap-0.5 text-xs text-[var(--text-secondary)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{s.organizationName}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleRevoke(s.organizationId)}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </div>
                    {s.mappedClientName && s.mappedProjectName ? (
                      <span className="text-[10px] text-emerald-400">
                        Mapped → {s.mappedClientName} · {s.mappedProjectName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400/80">
                        Awaiting agency mapping
                      </span>
                    )}
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
          </div>,
          document.body
        )}
    </div>
  );
}
