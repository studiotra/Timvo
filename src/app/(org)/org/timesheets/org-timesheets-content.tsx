"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reviewTimeLogShare, type TimeLogShareRow } from "@/app/actions/org-timesheets";

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function ShareRow({ row }: { row: TimeLogShareRow }) {
  const router = useRouter();

  async function review(action: "approve" | "reject") {
    const result = await reviewTimeLogShare(row.shareId, action);
    if (result.error) toast.error(result.error);
    else {
      toast.success(action === "approve" ? "Approved" : "Rejected");
      router.refresh();
    }
  }

  return (
    <tr className="border-b border-[var(--border)]">
      <td className="py-3 pr-4 text-sm text-[var(--text-primary)]">{row.contractorEmail}</td>
      <td className="py-3 pr-4 text-sm">{row.clientName}</td>
      <td className="py-3 pr-4 text-sm">{row.projectName}</td>
      <td className="py-3 pr-4 font-mono text-sm">{formatDuration(row.durationMinutes)}</td>
      <td className="py-3 pr-4 text-sm capitalize text-[var(--text-secondary)]">{row.status}</td>
      <td className="py-3">
        {row.status === "submitted" ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => review("approve")}
              className="rounded-md bg-emerald-600/20 px-2 py-1 text-xs font-semibold text-emerald-400"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => review("reject")}
              className="rounded-md bg-red-600/20 px-2 py-1 text-xs font-semibold text-red-400"
            >
              Reject
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

export function OrgTimesheetsContent({
  pending,
  all,
}: {
  pending: TimeLogShareRow[];
  all: TimeLogShareRow[];
}) {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Timesheets</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Review time contractors submit to your organization before invoicing or publishing to
        viewers.
      </p>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        Pending ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-muted)]">
          No pending submissions.
        </div>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <table className="w-full min-w-[640px] px-4 text-left">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] uppercase text-[var(--text-muted)]">
                <th className="px-4 py-3">Contractor</th>
                <th className="py-3">Client</th>
                <th className="py-3">Project</th>
                <th className="py-3">Duration</th>
                <th className="py-3">Status</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="px-4">
              {pending.map((row) => (
                <ShareRow key={row.shareId} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        All submissions
      </h2>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-[var(--border)] text-[11px] uppercase text-[var(--text-muted)]">
              <th className="px-4 py-3">Contractor</th>
              <th className="py-3">Client</th>
              <th className="py-3">Project</th>
              <th className="py-3">Duration</th>
              <th className="py-3">Status</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody>
            {all.map((row) => (
              <ShareRow key={row.shareId} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
