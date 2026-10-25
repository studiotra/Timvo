"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  archiveOrgClient,
  deleteOrgClient,
  unarchiveOrgClient,
  type OrgClientRow,
} from "@/app/actions/organizations";

export function OrgClientActions({
  client,
  onEdit,
  onChanged,
  onDeleted,
  align = "right",
}: {
  client: OrgClientRow;
  onEdit: () => void;
  onChanged?: () => void;
  onDeleted?: () => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const archived = client.status === "archived";

  async function run(action: () => Promise<{ error?: string }>, success: string) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    setOpen(false);
    if (result.error) {
      toast.error(result.error);
      return false;
    }
    toast.success(success);
    onChanged?.();
    return true;
  }

  function handleArchive() {
    const ok = confirm(
      archived
        ? "Restore this client to active?"
        : "Archive this client? They will be hidden from timers and new invoices."
    );
    if (!ok) return;
    void run(
      () => (archived ? unarchiveOrgClient(client.id) : archiveOrgClient(client.id)),
      archived ? "Client restored" : "Client archived"
    );
  }

  function handleDelete() {
    if (!client.canDelete) {
      toast.error("This client has invoices or time logs. Archive instead.");
      return;
    }
    const ok = confirm("Delete this client? This cannot be undone.");
    if (!ok) return;
    void run(() => deleteOrgClient(client.id), "Client deleted").then((did) => {
      if (did) onDeleted?.();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Client actions"
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg border border-[var(--border)] px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-app)] disabled:opacity-50"
      >
        ⋮
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-20 mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-1 shadow-lg ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-app)]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
          >
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-app)]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleArchive();
            }}
          >
            {archived ? "Unarchive" : "Archive"}
          </button>
          {client.canDelete ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-[var(--bg-app)]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete();
              }}
            >
              Delete
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ArchivedBadge() {
  return (
    <span className="rounded bg-gray-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-400">
      Archived
    </span>
  );
}
