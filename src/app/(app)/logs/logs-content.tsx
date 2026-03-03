"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, List, Calendar } from "lucide-react";
import { type TimeLogRow } from "@/app/actions/time-logs";
import { deleteTimeLog } from "@/app/actions/time-logs";
import { EditLogSlideOver } from "@/components/edit-log-slide-over";
import { ManualLogSlideOver } from "@/components/manual-log-slide-over";

type ViewMode = "week" | "month";
type DisplayMode = "list" | "calendar";
type ClientOpt = { id: string; name: string };

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

export function LogsContent({
  logs,
  clients,
  displayMode: initialDisplayMode,
  initialFilters,
}: {
  logs: TimeLogRow[];
  clients: ClientOpt[];
  displayMode: DisplayMode;
  initialFilters: { clientId: string; fromDate: string; toDate: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const displayMode = (searchParams.get("display") || initialDisplayMode) as DisplayMode;
  const view = displayMode === "calendar" ? "week" : (searchParams.get("view") || "week") as ViewMode;
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const [editingLog, setEditingLog] = useState<TimeLogRow | null>(null);
  const [addLogOpen, setAddLogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState(initialFilters.clientId);
  const [fromDate, setFromDate] = useState(initialFilters.fromDate);
  const [toDate, setToDate] = useState(initialFilters.toDate);

  useEffect(() => {
    setClientFilter(searchParams.get("client") ?? "");
    setFromDate(searchParams.get("from") ?? "");
    setToDate(searchParams.get("to") ?? "");
  }, [searchParams]);

  const label =
    fromDate && toDate
      ? `${fromDate} – ${toDate}`
      : view === "week"
        ? formatWeekLabel(offset)
        : formatMonthLabel(offset);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`/logs?${params.toString()}`);
  }

  function setViewOffset(v: ViewMode, o: number) {
    const params = new URLSearchParams(searchParams);
    params.set("view", v);
    params.set("offset", String(o));
    params.delete("from");
    params.delete("to");
    router.push(`/logs?${params.toString()}`);
  }

  function setDisplayMode(d: DisplayMode) {
    const params = new URLSearchParams(searchParams);
    params.set("display", d);
    if (d === "calendar") {
      params.set("view", "week");
      params.set("offset", "0");
    }
    router.push(`/logs?${params.toString()}`);
  }

  function applyFilters() {
    updateParams({
      client: clientFilter,
      from: fromDate,
      to: toDate,
    });
  }


  async function handleDelete(id: string) {
    if (!confirm("Delete this time log?")) return;
    setDeletingId(id);
    const result = await deleteTimeLog(id);
    setDeletingId(null);
    if (result.error) {
      toast.error(result.error);
    }
  }

  const totalMins = logs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);

  const weekStart = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setDate(monday.getDate() + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, [offset]);
  const logsByDay = useMemo(() => {
    const map: Record<string, TimeLogRow[]> = {};
    for (const log of logs) {
      const d = log.started_at ? new Date(log.started_at) : null;
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!map[key]) map[key] = [];
        map[key].push(log);
      }
    }
    return map;
  }, [logs]);

  const hoursByClient = useMemo(() => {
    const map: Record<string, number> = {};
    for (const log of logs) {
      const name = log.client_name || "Unknown";
      map[name] = (map[name] ?? 0) + (log.duration_minutes ?? 0);
    }
    return Object.entries(map)
      .map(([name, mins]) => ({ name, hours: mins / 60 }))
      .sort((a, b) => b.hours - a.hours);
  }, [logs]);

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { date: d, key };
    });
  }, [weekStart]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1">
            <button
              onClick={() => setDisplayMode("list")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${displayMode === "list" ? "bg-accent text-white" : "text-[var(--text-secondary)] hover:bg-white/5"}`}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              onClick={() => setDisplayMode("calendar")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${displayMode === "calendar" ? "bg-accent text-white" : "text-[var(--text-secondary)] hover:bg-white/5"}`}
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
              placeholder="From"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
              placeholder="To"
            />
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-lg border border-[var(--border)] bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Apply
            </button>
            {(clientFilter || fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setClientFilter("");
                  setFromDate("");
                  setToDate("");
                  updateParams({ client: "", from: "", to: "" });
                }}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Clear filters
              </button>
            )}
          </div>
          {displayMode === "list" && (
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
          )}
          {displayMode === "list" && (
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
          )}
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

      {/* Weekly summary: hours by day, by client */}
      {(displayMode === "calendar" || (displayMode === "list" && view === "week" && !fromDate && !toDate)) && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Weekly summary</h3>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">By day</div>
              <div className="mt-2 flex gap-2">
                {weekDays.map(({ key, date }) => {
                  const dayLogs = logsByDay[key] ?? [];
                  const mins = dayLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
                  return (
                    <div
                      key={key}
                      className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 min-w-[48px]"
                    >
                      <span className="text-[10px] font-medium text-[var(--text-muted)]">
                        {dayLabels[(date.getDay() + 6) % 7]}
                      </span>
                      <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                        {(mins / 60).toFixed(1)}h
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">By client</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {hoursByClient.length === 0 ? (
                  <span className="text-sm text-[var(--text-muted)]">No logs this week</span>
                ) : (
                  hoursByClient.map(({ name, hours }) => (
                    <span
                      key={name}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-1.5 text-sm font-mono"
                    >
                      {name}: {hours.toFixed(1)}h
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="ml-auto flex items-center">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Total</span>
              <span className="ml-2 font-mono text-lg font-bold text-accent">{(totalMins / 60).toFixed(1)}h</span>
            </div>
          </div>
        </div>
      )}

      {displayMode === "calendar" ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-5 sm:py-4">
            <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
              {formatWeekLabel(offset)}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("offset", String(offset - 1));
                  router.push(`/logs?${params.toString()}`);
                }}
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-app)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("offset", String(offset + 1));
                  router.push(`/logs?${params.toString()}`);
                }}
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-app)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {weekDays.map(({ date, key }) => (
              <div key={key} className="px-1 py-2 text-center text-[9px] font-bold uppercase text-[var(--text-muted)] sm:px-2 sm:text-[10px]">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {weekDays.map(({ date, key }) => {
              const dayLogs = logsByDay[key] ?? [];
              const dayMins = dayLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
              return (
                <div
                  key={key}
                  className="aspect-[1.6/1] border-b border-r border-[var(--border)] p-1.5 last:border-r-0 sm:p-2"
                >
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] mb-0.5 sm:text-[11px] sm:mb-1">
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    {dayLogs.slice(0, 3).map((log) => (
                      <button
                        key={log.id}
                        onClick={() => setEditingLog(log)}
                        className="block w-full text-left text-[9px] truncate rounded px-1 py-0.5 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25 sm:text-[10px]"
                      >
                        {log.project_name}: {log.duration_minutes}m
                      </button>
                    ))}
                    {dayLogs.length > 3 && (
                      <span className="text-[8px] text-[var(--text-muted)] sm:text-[9px]">+{dayLogs.length - 3}</span>
                    )}
                  </div>
                  {dayLogs.length > 0 && (
                    <div className="mt-0.5 text-[8px] font-mono text-[var(--text-muted)] sm:mt-1 sm:text-[9px]">
                      {Math.floor(dayMins / 60)}h {dayMins % 60}m
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-sidebar)]/50">
                <th className="px-2 py-2 text-left text-xs font-medium text-[var(--text-secondary)] sm:px-4 sm:py-3 sm:text-sm">Client</th>
                <th className="hidden px-4 py-3 text-left font-medium text-[var(--text-secondary)] sm:table-cell">Project</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[var(--text-secondary)] sm:px-4 sm:py-3 sm:text-sm">Date</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-[var(--text-secondary)] sm:px-4 sm:py-3 sm:text-sm">Duration</th>
                <th className="hidden px-4 py-3 text-left font-medium text-[var(--text-secondary)] md:table-cell">Description</th>
                <th className="hidden px-4 py-3 text-center font-medium text-[var(--text-secondary)] md:table-cell">Billable</th>
                <th className="hidden px-4 py-3 text-center font-medium text-[var(--text-secondary)] md:table-cell">Billed</th>
                <th className="px-2 py-2 w-14 sm:w-20" />
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
                    <td className="px-2 py-2 text-xs text-[var(--text-primary)] sm:px-4 sm:py-3 sm:text-sm">{log.client_name}</td>
                    <td className="hidden px-4 py-3 text-[var(--text-primary)] sm:table-cell">{log.project_name}</td>
                    <td className="px-2 py-2 text-xs text-[var(--text-secondary)] sm:px-4 sm:py-3 sm:text-sm">
                      {log.started_at ? new Date(log.started_at).toLocaleDateString("en-US") : "—"}
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-xs text-[var(--text-primary)] sm:px-4 sm:py-3 sm:text-sm">
                      {log.duration_minutes} min
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--text-secondary)] max-w-[200px] truncate md:table-cell">
                      {log.description || "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-center md:table-cell">
                      {log.is_billable ? (
                        <span className="text-emerald-400">Yes</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">No</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-center md:table-cell">
                      {log.is_billed ? (
                        <span className="text-indigo-400">Yes</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">No</span>
                      )}
                    </td>
                    <td className="px-2 py-2 sm:px-4 sm:py-3">
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
      )}

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
