"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  bulkReviewTimeLogShares,
  reviewTimeLogShare,
  type TimeLogShareRow,
} from "@/app/actions/org-timesheets";

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function formatRate(rate: number | null) {
  if (rate == null) return "—";
  return `$${rate.toFixed(2)}/hr`;
}

function ShareRow({
  row,
  selectable,
  selected,
  onToggle,
}: {
  row: TimeLogShareRow;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
}) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [costRate, setCostRate] = useState(
    row.defaultCostRate != null ? String(row.defaultCostRate) : ""
  );
  const [billRate, setBillRate] = useState(
    row.defaultBillRate != null ? String(row.defaultBillRate) : ""
  );
  const [busy, setBusy] = useState(false);

  async function review(action: "approve" | "reject") {
    setBusy(true);
    const result = await reviewTimeLogShare(row.shareId, action, {
      costRate: action === "approve" ? costRate : undefined,
      billRate: action === "approve" ? billRate : undefined,
    });
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(action === "approve" ? "Approved" : "Rejected");
      setApproving(false);
      router.refresh();
    }
  }

  const colSpan = selectable ? 6 : 5;

  return (
    <>
      <tr className="border-b border-[var(--border)]">
        {selectable ? (
          <td className="px-4 py-3">
            {row.status === "submitted" ? (
              <input
                type="checkbox"
                checked={Boolean(selected)}
                onChange={() => onToggle?.(row.shareId)}
                className="rounded border-[var(--border)]"
                aria-label={`Select ${row.shareId}`}
              />
            ) : null}
          </td>
        ) : null}
        <td className="py-3 pr-4 text-sm text-[var(--text-primary)]">{row.contractorEmail}</td>
        <td className="py-3 pr-4 text-sm">
          {row.isMapped ? (
            <div>
              <div className="text-[var(--text-primary)]">
                {row.mappedClientName} · {row.mappedProjectName}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                from {row.clientName} / {row.projectName}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-amber-400/90">Unmapped</div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {row.clientName} / {row.projectName}
              </div>
              <Link
                href="/org/assignments"
                className="text-[10px] text-violet-400 hover:underline"
              >
                Assign on board →
              </Link>
            </div>
          )}
        </td>
        <td className="py-3 pr-4 font-mono text-sm">{formatDuration(row.durationMinutes)}</td>
        <td className="py-3 pr-4 text-sm">
          {row.status === "approved" || row.status === "published" ? (
            <span className="text-xs text-[var(--text-secondary)]">
              {formatRate(row.costRate)} cost · {formatRate(row.billRate)} bill
            </span>
          ) : (
            <span className="capitalize text-[var(--text-secondary)]">{row.status}</span>
          )}
        </td>
        <td className="py-3">
          {row.status === "submitted" ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setApproving((v) => !v)}
                className="rounded-md bg-emerald-600/20 px-2 py-1 text-xs font-semibold text-emerald-400"
              >
                {approving ? "Cancel" : "Approve"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => review("reject")}
                className="rounded-md bg-red-600/20 px-2 py-1 text-xs font-semibold text-red-400 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          ) : null}
        </td>
      </tr>
      {approving && row.status === "submitted" ? (
        <tr className="border-b border-[var(--border)] bg-[var(--bg-app)]/50">
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-[var(--text-secondary)]">
                Cost rate ($/hr)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costRate}
                  onChange={(e) => setCostRate(e.target.value)}
                  placeholder="Contractor cost"
                  className="mt-1 block w-32 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-[var(--text-secondary)]">
                Bill rate ($/hr)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={billRate}
                  onChange={(e) => setBillRate(e.target.value)}
                  placeholder="Client bill rate"
                  className="mt-1 block w-32 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => review("approve")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : "Confirm approve"}
              </button>
              <p className="w-full text-xs text-[var(--text-muted)]">
                {row.isMapped
                  ? "Defaults from mapped agency project assignment / bill rate."
                  : "Not mapped yet — map on Assignments for end-client defaults."}
              </p>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function TimesheetTable({
  rows,
  empty,
  selectable,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  rows: TimeLogShareRow[];
  empty: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: (ids: string[], checked: boolean) => void;
}) {
  const selectableIds = useMemo(
    () => rows.filter((r) => r.status === "submitted").map((r) => r.shareId),
    [rows]
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds?.has(id));

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-muted)]">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      <table className="w-full min-w-[760px] text-left">
        <thead>
          <tr className="border-b border-[var(--border)] text-[11px] uppercase text-[var(--text-muted)]">
            {selectable ? (
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleAll?.(selectableIds, e.target.checked)}
                  className="rounded border-[var(--border)]"
                  aria-label="Select all pending"
                />
              </th>
            ) : null}
            <th className="px-4 py-3">Contractor</th>
            <th className="py-3">End client / project</th>
            <th className="py-3">Duration</th>
            <th className="py-3">Status / rates</th>
            <th className="py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ShareRow
              key={row.shareId}
              row={row}
              selectable={selectable}
              selected={selectedIds?.has(row.shareId)}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrgTimesheetsContent({
  pending,
  all,
}: {
  pending: TimeLogShareRow[];
  all: TimeLogShareRow[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const unmappedPending = pending.filter((r) => !r.isMapped).length;
  const selectedCount = selectedIds.size;
  const selectedUnmapped = pending.filter(
    (r) => selectedIds.has(r.shareId) && !r.isMapped
  ).length;

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function bulk(action: "approve" | "reject") {
    if (selectedCount === 0) {
      toast.error("Select at least one timesheet");
      return;
    }
    setBusy(true);
    const result = await bulkReviewTimeLogShares([...selectedIds], action);
    setBusy(false);
    if (result.error && !result.processed) {
      toast.error(result.error);
      return;
    }
    const verb = action === "approve" ? "Approved" : "Rejected";
    if (result.failed) {
      toast.success(`${verb} ${result.processed}; ${result.failed} failed`);
    } else {
      toast.success(`${verb} ${result.processed} timesheet${result.processed === 1 ? "" : "s"}`);
    }
    setSelectedIds(new Set());
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Timesheets</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Approve or reject contractor submissions here. Mapping on{" "}
        <Link href="/org/assignments" className="text-violet-400 hover:underline">
          Assignments
        </Link>{" "}
        is optional and improves rate defaults and reports.
      </p>

      {unmappedPending > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          {unmappedPending} pending submission{unmappedPending === 1 ? "" : "s"} not mapped to an
          end-client project yet.
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
          <span className="text-sm text-[var(--text-primary)]">
            {selectedCount === 0
              ? "Select pending rows to bulk approve"
              : `${selectedCount} selected`}
          </span>
          <button
            type="button"
            disabled={busy || selectedCount === 0}
            onClick={() => bulk("approve")}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Working…" : "Bulk approve"}
          </button>
          <button
            type="button"
            disabled={busy || selectedCount === 0}
            onClick={() => bulk("reject")}
            className="rounded-lg bg-red-600/80 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Bulk reject
          </button>
          {selectedCount > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              Clear
            </button>
          )}
          {selectedUnmapped > 0 && (
            <span className="text-xs text-amber-300">
              {selectedUnmapped} unmapped — rates may be incomplete
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)]">
            Bulk approve uses each row&apos;s mapped default rates
          </span>
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Pending ({pending.length})
      </h2>
      <div className="mb-8">
        <TimesheetTable
          rows={pending}
          empty="No pending submissions."
          selectable
          selectedIds={selectedIds}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        All submissions
      </h2>
      <TimesheetTable rows={all} empty="No submissions yet." />
    </div>
  );
}
