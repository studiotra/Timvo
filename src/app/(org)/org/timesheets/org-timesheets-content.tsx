"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reviewTimeLogShare, type TimeLogShareRow } from "@/app/actions/org-timesheets";
import { useState } from "react";
import Link from "next/link";

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

function ShareRow({ row }: { row: TimeLogShareRow }) {
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

  return (
    <>
      <tr className="border-b border-[var(--border)]">
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
          <td colSpan={5} className="px-4 py-3">
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
}: {
  rows: TimeLogShareRow[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-muted)]">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-[var(--border)] text-[11px] uppercase text-[var(--text-muted)]">
            <th className="px-4 py-3">Contractor</th>
            <th className="py-3">End client / project</th>
            <th className="py-3">Duration</th>
            <th className="py-3">Status / rates</th>
            <th className="py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="px-4">
          {rows.map((row) => (
            <ShareRow key={row.shareId} row={row} />
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
  const unmappedPending = pending.filter((r) => !r.isMapped).length;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Timesheets</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Review submitted time in the context of your end-client projects. Map shares on{" "}
        <Link href="/org/assignments" className="text-violet-400 hover:underline">
          Assignments
        </Link>{" "}
        first for the best rate defaults.
      </p>

      {unmappedPending > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          {unmappedPending} pending submission{unmappedPending === 1 ? "" : "s"} not mapped to an
          end-client project yet.
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Pending ({pending.length})
      </h2>
      <div className="mb-8">
        <TimesheetTable rows={pending} empty="No pending submissions." />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        All submissions
      </h2>
      <TimesheetTable rows={all} empty="No submissions yet." />
    </div>
  );
}
