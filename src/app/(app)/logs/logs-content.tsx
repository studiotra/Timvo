"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { type TimeLogRow } from "@/app/actions/time-logs";
import { deleteTimeLog } from "@/app/actions/time-logs";
import { EditLogSlideOver } from "@/components/edit-log-slide-over";
import { ManualLogSlideOver } from "@/components/manual-log-slide-over";

type ViewMode = "week" | "month";

function formatWeekLabel(offsetWeeks: number): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  monday.setDate(monday.getDate() + offsetWeeks * 7);
  const weekEnd = new Date(monday);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatMonthLabel(offsetMonths: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function LogsContent({ logs }: { logs: TimeLogRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") || "week") as ViewMode;
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const [editingLog, setEditingLog] = useState<TimeLogRow | null>(null);
  const [addLogOpen, setAddLogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const label = view === "week" ? formatWeekLabel(offset) : formatMonthLabel(offset);

  function setViewOffset(v: ViewMode, o: number) {
    const params = new URLSearchParams(searchParams);
    params.set("view", v);
    params.set("offset", String(o));
    router.push(`/logs?${params.toString()}`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this time log?")) return;
    setDeletingId(id);
    const result = await deleteTimeLog(id);
    setDeletingId(null);
    if (result.error) {
      alert(result.error);
    }
  }

  const totalMins = logs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1">
            <button
              onClick={() => setViewOffset("week", 0)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${view === "week" ? "bg-accent text-white" : "text-[var(--text-secondary)] hover:bg-white/5"}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewOffset("month", 0)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${view === "month" ? "bg-accent text-white" : "text-[var(--text-secondary)] hover:bg-white/5"}`}
            >
              Month
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewOffset(view, offset - 1)}
              className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[200px] text-center text-sm font-medium text-[var(--text-primary)]">
              {label}
            </span>
            <button
              onClick={() => setViewOffset(view, offset + 1)}
              className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAddLogOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
        >
          <Plus className="h-4 w-4" />
          Add log
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-sidebar)]/50">
                <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Client</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Project</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Date</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">Description</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--text-secondary)]">Billable</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--text-secondary)]">Billed</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">
                    No time logs for this period.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-white/5"
                  >
                    <td className="px-4 py-3 text-[var(--text-primary)]">{log.client_name}</td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{log.project_name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {log.started_at ? new Date(log.started_at).toLocaleDateString("en-US") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[var(--text-primary)]">
                      {log.duration_minutes} min
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[200px] truncate">
                      {log.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.is_billable ? (
                        <span className="text-emerald-400">Yes</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.is_billed ? (
                        <span className="text-indigo-400">Yes</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingLog(log)}
                          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          disabled={deletingId === log.id || log.is_billed}
                          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={log.is_billed ? "Cannot delete billed log" : "Delete"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {logs.length > 0 && (
          <div className="border-t border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
            Total: {Math.floor(totalMins / 60)}h {totalMins % 60}m
          </div>
        )}
      </div>

      {editingLog && (
        <EditLogSlideOver
          key={editingLog.id}
          log={editingLog}
          open={!!editingLog}
          onClose={() => {
            setEditingLog(null);
            router.refresh();
          }}
        />
      )}
      <ManualLogSlideOver
        open={addLogOpen}
        onClose={() => {
          setAddLogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
