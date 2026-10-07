"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, List, Calendar, Map as MapIcon } from "lucide-react";
import { type TimeLogRow, getTimeLogs, deleteTimeLog } from "@/app/actions/time-logs";
import { DayLogsSlideOver } from "@/components/day-logs-slide-over";
import { EditLogSlideOver } from "@/components/edit-log-slide-over";
import { ManualLogSlideOver } from "@/components/manual-log-slide-over";
import { SubmitToOrgBar } from "@/components/submit-to-org-bar";
import type { ContractorOrgOption } from "@/app/actions/organizations";
import { useTimezone } from "@/contexts/timezone-context";
import {
  addDaysToDateString,
  formatDateOnly,
  formatInstantAsLocalDate,
  getMonthRange,
  getWeekRange,
  localToday,
} from "@/lib/dates";
import {
  buildMonthGrid,
  dayLogVisibility,
  formatDayDuration,
  MONTH_VISIBLE_LOGS,
  WEEK_VISIBLE_LOGS,
} from "@/lib/logs/calendar";

type ViewMode = "week" | "month";
type DisplayMode = "list" | "calendar" | "map";
type MapGroup = "all" | "client" | "project";
type ClientOpt = { id: string; name: string };

function formatWeekLabel(timezone: string, offsetWeeks: number): string {
  const { mondayDate, sundayDate } = getWeekRange(timezone, offsetWeeks);
  return `${formatDateOnly(mondayDate)} – ${formatDateOnly(sundayDate, { year: "numeric" })}`;
}

function formatMonthLabel(timezone: string, offsetMonths: number): string {
  const { monthDate } = getMonthRange(timezone, offsetMonths);
  const [y, m] = monthDate.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
  return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
}

export function LogsContent({
  logs,
  clients,
  organizations = [],
  shareStatuses = {},
  displayMode: initialDisplayMode,
  initialFilters,
  basePath = "/logs",
}: {
  logs: TimeLogRow[];
  clients: ClientOpt[];
  organizations?: ContractorOrgOption[];
  shareStatuses?: Record<string, { orgName: string; status: string }[]>;
  displayMode: DisplayMode;
  initialFilters: { clientId: string; fromDate: string; toDate: string };
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timezone = useTimezone();
  const displayMode = (["list", "calendar", "map"].includes(searchParams.get("display") || "")
    ? searchParams.get("display")
    : initialDisplayMode) as DisplayMode;
  const mapGroup = (searchParams.get("group") || "all") as MapGroup;
  const view = (searchParams.get("view") === "month" ? "month" : "week") as ViewMode;
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const [localLogs, setLocalLogs] = useState(logs);
  const [editingLog, setEditingLog] = useState<TimeLogRow | null>(null);
  const [dayListDateKey, setDayListDateKey] = useState<string | null>(null);
  const [addLogOpen, setAddLogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState(initialFilters.clientId);
  const [fromDate, setFromDate] = useState(initialFilters.fromDate);
  const [toDate, setToDate] = useState(initialFilters.toDate);

  useEffect(() => {
    setLocalLogs(logs);
  }, [logs]);

  useEffect(() => {
    setClientFilter(searchParams.get("client") ?? "");
    setFromDate(searchParams.get("from") ?? "");
    setToDate(searchParams.get("to") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setDayListDateKey(null);
  }, [view, offset, displayMode]);

  async function refreshLogsList() {
    const filters =
      clientFilter || fromDate || toDate
        ? {
            clientId: clientFilter || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
          }
        : undefined;
    const fresh = await getTimeLogs(view, offset, filters);
    setLocalLogs(fresh);
  }

  const label =
    fromDate && toDate
      ? `${fromDate} – ${toDate}`
      : view === "week"
        ? formatWeekLabel(timezone, offset)
        : formatMonthLabel(timezone, offset);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  function setViewOffset(v: ViewMode, o: number) {
    const params = new URLSearchParams(searchParams);
    params.set("view", v);
    params.set("offset", String(o));
    params.delete("from");
    params.delete("to");
    router.push(`${basePath}?${params.toString()}`);
  }

  function setDisplayMode(d: DisplayMode) {
    const params = new URLSearchParams(searchParams);
    params.set("display", d);
    if (d === "calendar") {
      const existing = params.get("view");
      if (existing !== "week" && existing !== "month") {
        params.set("view", "week");
      }
      if (!params.get("offset")) {
        params.set("offset", "0");
      }
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  function openDayList(dateKey: string) {
    setDayListDateKey(dateKey);
  }

  function closeDayList() {
    setDayListDateKey(null);
  }

  function selectLogFromDayList(log: TimeLogRow) {
    setDayListDateKey(null);
    setEditingLog(log);
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
      return;
    }
    toast.success("Time log deleted");
    setLocalLogs((prev) => prev.filter((l) => l.id !== id));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  const totalMins = localLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);

  const weekRange = useMemo(
    () => getWeekRange(timezone, offset),
    [timezone, offset]
  );
  const logsByDay = useMemo(() => {
    const map: Record<string, TimeLogRow[]> = {};
    for (const log of localLogs) {
      if (!log.started_at) continue;
      const key = formatInstantAsLocalDate(log.started_at, timezone);
      if (!map[key]) map[key] = [];
      map[key].push(log);
    }
    return map;
  }, [localLogs, timezone]);

  const hoursByClient = useMemo(() => {
    const map: Record<string, number> = {};
    for (const log of localLogs) {
      const name = log.client_name || "Unknown";
      map[name] = (map[name] ?? 0) + (log.duration_minutes ?? 0);
    }
    return Object.entries(map)
      .map(([name, mins]) => ({ name, hours: mins / 60 }))
      .sort((a, b) => b.hours - a.hours);
  }, [localLogs]);

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDaysToDateString(weekRange.mondayDate, i);
      return { key, label: formatDateOnly(key) };
    });
  }, [weekRange.mondayDate]);

  const todayKey = useMemo(() => localToday(timezone), [timezone]);

  const monthGrid = useMemo(() => {
    if (view !== "month") return [];
    const { monthDate } = getMonthRange(timezone, offset);
    return buildMonthGrid(monthDate, todayKey);
  }, [view, timezone, offset, todayKey]);

  const dayListLogs = useMemo(() => {
    if (!dayListDateKey) return [];
    return logsByDay[dayListDateKey] ?? [];
  }, [dayListDateKey, logsByDay]);

  const showSelection = organizations.length > 0;

  return (
    <div className="space-y-6">
      {organizations.length > 0 && (
        <SubmitToOrgBar
          organizations={organizations}
          selectedLogIds={selectedIds}
          onClearSelection={() => setSelectedIds([])}
        />
      )}
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
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${displayMode === "calendar" ? "bg-accent text-white" : "text-[var(--text-secondary)] hover:bg-[var(--row-hover)]"}`}
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </button>
            <button
              onClick={() => setDisplayMode("map")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${displayMode === "map" ? "bg-accent text-white" : "text-[var(--text-secondary)] hover:bg-[var(--row-hover)]"}`}
            >
              <MapIcon className="h-4 w-4" />
              Map
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              aria-label="Filter by client"
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
              aria-label="From date"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
              placeholder="From"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="To date"
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
          {displayMode === "map" && (
            <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1">
              {([
                ["all", "All"],
                ["client", "By client"],
                ["project", "By project"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateParams({ group: value === "all" ? "" : value })}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${mapGroup === value ? "bg-accent text-white" : "text-[var(--text-secondary)] hover:bg-[var(--row-hover)]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {(displayMode === "list" || displayMode === "calendar") && (
            <div className="flex rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1">
              <button
                type="button"
                onClick={() => setViewOffset("week", 0)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${view === "week" ? "bg-accent text-white" : "text-[var(--text-secondary)] hover:bg-white/5"}`}
              >
                Week
              </button>
              <button
                type="button"
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
                type="button"
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
                type="button"
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
      {((displayMode === "calendar" && view === "week") ||
        (displayMode === "list" && view === "week" && !fromDate && !toDate)) && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Weekly summary</h3>
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">By day</div>
              <div className="mt-2 flex gap-2">
                {weekDays.map(({ key }, i) => {
                  const dayLogs = logsByDay[key] ?? [];
                  const mins = dayLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
                  return (
                    <div
                      key={key}
                      className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 min-w-[48px]"
                    >
                      <span className="text-[10px] font-medium text-[var(--text-muted)]">
                        {dayLabels[i]}
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

      {displayMode === "map" ? (
        <LogsMapView
          logs={localLogs}
          group={mapGroup}
          onEdit={setEditingLog}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      ) : displayMode === "calendar" ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 sm:px-5 sm:py-4">
            <h2 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
              {view === "week"
                ? formatWeekLabel(timezone, offset)
                : formatMonthLabel(timezone, offset)}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewOffset(view, offset - 1)}
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-app)]"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewOffset(view, 0)}
                className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-app)] hover:text-[var(--text-primary)] sm:text-sm"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setViewOffset(view, offset + 1)}
                className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-app)]"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {dayLabels.map((label) => (
              <div
                key={label}
                className="px-1 py-2 text-center text-[9px] font-bold uppercase text-[var(--text-muted)] sm:px-2 sm:text-[10px]"
              >
                {label}
              </div>
            ))}
          </div>
          {view === "week" ? (
            <div className="grid grid-cols-7">
              {weekDays.map(({ key }) => {
                const dayLogs = logsByDay[key] ?? [];
                const dayMins = dayLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
                const dayNum = Number(key.slice(8, 10));
                const { visibleCount, overflowCount } = dayLogVisibility(
                  dayLogs.length,
                  WEEK_VISIBLE_LOGS
                );
                const isToday = key === todayKey;
                const dayOpen = dayListDateKey === key;
                return (
                  <div
                    key={key}
                    className={`flex min-h-[160px] flex-col border-b border-r border-[var(--border)] p-1.5 last:border-r-0 sm:min-h-[200px] sm:p-2 lg:min-h-[220px] ${
                      isToday ? "bg-accent/5" : ""
                    }`}
                  >
                    <div
                      className={`mb-0.5 text-[10px] font-semibold sm:mb-1 sm:text-[11px] ${
                        isToday ? "text-accent" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {dayNum}
                    </div>
                    <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden sm:space-y-1">
                      {dayLogs.slice(0, visibleCount).map((log) => (
                        <button
                          key={log.id}
                          type="button"
                          onClick={() => setEditingLog(log)}
                          className="block w-full truncate rounded px-1 py-0.5 text-left text-[9px] bg-indigo-500/15 text-[var(--accent-text)] hover:bg-indigo-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-[10px]"
                        >
                          {log.project_name}: {log.duration_minutes}m
                        </button>
                      ))}
                      {overflowCount > 0 && (
                        <button
                          type="button"
                          onClick={() => openDayList(key)}
                          aria-label={`Show all ${dayLogs.length} logs for ${formatDateOnly(key, { month: "long", year: "numeric" })}`}
                          aria-haspopup="dialog"
                          aria-expanded={dayOpen}
                          className="block w-full rounded px-1 py-0.5 text-left text-[8px] text-[var(--text-muted)] hover:bg-[var(--row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-[9px]"
                        >
                          +{overflowCount} more
                        </button>
                      )}
                    </div>
                    {dayLogs.length > 0 && (
                      <div className="mt-auto pt-0.5 font-mono text-[8px] text-[var(--text-muted)] sm:pt-1 sm:text-[9px]">
                        {formatDayDuration(dayMins)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {monthGrid.map((week) => (
                <div key={week[0].dateKey} className="grid grid-cols-7">
                  {week.map((cell) => {
                    const dayLogs = cell.inMonth ? (logsByDay[cell.dateKey] ?? []) : [];
                    const dayMins = dayLogs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
                    const { visibleCount, overflowCount } = dayLogVisibility(
                      dayLogs.length,
                      MONTH_VISIBLE_LOGS
                    );
                    const dayOpen = dayListDateKey === cell.dateKey;
                    const dim = !cell.inMonth;
                    return (
                      <div
                        key={cell.dateKey}
                        className={`min-h-[64px] border-b border-r border-[var(--border)] p-1 last:border-r-0 sm:min-h-[96px] sm:p-1.5 lg:min-h-[110px] ${
                          cell.isToday ? "bg-accent/5" : ""
                        } ${dim ? "bg-[var(--bg-app)]/40" : ""}`}
                      >
                        {/* Narrow screens: day number + total + count opens day list */}
                        <button
                          type="button"
                          disabled={dim || dayLogs.length === 0}
                          onClick={() => {
                            if (!dim && dayLogs.length > 0) openDayList(cell.dateKey);
                          }}
                          aria-label={
                            dim
                              ? `${formatDateOnly(cell.dateKey)} outside month`
                              : dayLogs.length === 0
                                ? `${formatDateOnly(cell.dateKey, { month: "long", year: "numeric" })}, no logs`
                                : `Show all ${dayLogs.length} logs for ${formatDateOnly(cell.dateKey, { month: "long", year: "numeric" })}`
                          }
                          aria-haspopup={dayLogs.length > 0 ? "dialog" : undefined}
                          aria-expanded={dayLogs.length > 0 ? dayOpen : undefined}
                          className={`flex w-full flex-col items-start rounded px-0.5 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default sm:hidden ${
                            dim ? "opacity-40" : ""
                          }`}
                        >
                          <span
                            className={`text-[10px] font-semibold ${
                              cell.isToday ? "text-accent" : "text-[var(--text-muted)]"
                            }`}
                          >
                            {cell.dayNum}
                          </span>
                          {!dim && dayLogs.length > 0 && (
                            <span className="mt-0.5 flex items-center gap-1 font-mono text-[8px] text-[var(--text-muted)]">
                              {formatDayDuration(dayMins)}
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
                                aria-hidden
                              />
                              <span>{dayLogs.length}</span>
                            </span>
                          )}
                        </button>
                        {/* Wider screens: chips + overflow */}
                        <div className={`hidden h-full flex-col sm:flex ${dim ? "opacity-40" : ""}`}>
                          <div
                            className={`mb-0.5 text-[10px] font-semibold sm:text-[11px] ${
                              cell.isToday ? "text-accent" : "text-[var(--text-muted)]"
                            }`}
                          >
                            {cell.dayNum}
                          </div>
                          {!dim && (
                            <>
                              <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
                                {dayLogs.slice(0, visibleCount).map((log) => (
                                  <button
                                    key={log.id}
                                    type="button"
                                    onClick={() => setEditingLog(log)}
                                    className="block w-full truncate rounded px-1 py-0.5 text-left text-[9px] bg-indigo-500/15 text-[var(--accent-text)] hover:bg-indigo-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-[10px]"
                                  >
                                    {log.project_name}: {log.duration_minutes}m
                                  </button>
                                ))}
                                {overflowCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => openDayList(cell.dateKey)}
                                    aria-label={`Show all ${dayLogs.length} logs for ${formatDateOnly(cell.dateKey, { month: "long", year: "numeric" })}`}
                                    aria-haspopup="dialog"
                                    aria-expanded={dayOpen}
                                    className="block w-full rounded px-1 py-0.5 text-left text-[8px] text-[var(--text-muted)] hover:bg-[var(--row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-[9px]"
                                  >
                                    +{overflowCount} more
                                  </button>
                                )}
                              </div>
                              {dayLogs.length > 0 && (
                                <div className="mt-auto pt-0.5 font-mono text-[8px] text-[var(--text-muted)] sm:text-[9px]">
                                  {formatDayDuration(dayMins)}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-sidebar)]/50">
                {showSelection && (
                  <th className="w-10 px-2 py-2 sm:px-4 sm:py-3" />
                )}
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
              {localLogs.length === 0 ? (
                <tr>
                  <td colSpan={showSelection ? 9 : 8} className="px-4 py-12 text-center text-[var(--text-muted)]">
                    No time logs for this period.
                  </td>
                </tr>
              ) : (
                localLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-white/5"
                  >
                    {showSelection && (
                      <td className="px-2 py-2 sm:px-4 sm:py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(log.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, log.id]
                                : prev.filter((id) => id !== log.id)
                            );
                          }}
                          className="rounded border-[var(--border)]"
                          aria-label={`Select log ${log.id}`}
                        />
                      </td>
                    )}
                    <td className="px-2 py-2 text-xs text-[var(--text-primary)] sm:px-4 sm:py-3 sm:text-sm">
                      <div>{log.client_name}</div>
                      {(shareStatuses[log.id] ?? []).map((s) => (
                        <span
                          key={`${log.id}-${s.orgName}`}
                          className="mt-0.5 mr-1 inline-block rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300"
                        >
                          {s.orgName}: {s.status}
                        </span>
                      ))}
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--text-primary)] sm:table-cell">{log.project_name}</td>
                    <td className="px-2 py-2 text-xs text-[var(--text-secondary)] sm:px-4 sm:py-3 sm:text-sm">
                      {log.started_at
                        ? formatDateOnly(formatInstantAsLocalDate(log.started_at, timezone), {
                            year: "numeric",
                          })
                        : "—"}
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
        {localLogs.length > 0 && (
          <div className="border-t border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
            Total: {Math.floor(totalMins / 60)}h {totalMins % 60}m
          </div>
        )}
      </div>
      )}

      <DayLogsSlideOver
        open={!!dayListDateKey}
        dateKey={dayListDateKey}
        logs={dayListLogs}
        onClose={closeDayList}
        onSelectLog={selectLogFromDayList}
      />
      {editingLog && (
        <EditLogSlideOver
          key={editingLog.id}
          log={editingLog}
          open={!!editingLog}
          scope={basePath.startsWith("/org") ? "org" : "contractor"}
          onClose={() => setEditingLog(null)}
          onSuccess={() => {
            void refreshLogsList();
          }}
        />
      )}
      <ManualLogSlideOver
        open={addLogOpen}
        scope={basePath.startsWith("/org") ? "org" : "contractor"}
        onClose={() => setAddLogOpen(false)}
        onSuccess={() => {
          void refreshLogsList();
        }}
      />
    </div>
  );
}

function formatLogMins(mins: number) {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function LogsMapView({
  logs,
  group,
  onEdit,
  onDelete,
  deletingId,
}: {
  logs: TimeLogRow[];
  group: MapGroup;
  onEdit: (log: TimeLogRow) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const branches = useMemo(() => {
    if (group === "project") {
      const map = new globalThis.Map<string, { title: string; subtitle: string; logs: TimeLogRow[] }>();
      for (const log of logs) {
        const key = log.project_id || log.project_name;
        const existing = map.get(key);
        if (existing) existing.logs.push(log);
        else {
          map.set(key, {
            title: log.project_name,
            subtitle: log.client_name,
            logs: [log],
          });
        }
      }
      return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
    }

    const map = new globalThis.Map<string, { title: string; children: globalThis.Map<string, TimeLogRow[]> }>();
    for (const log of logs) {
      const clientKey = log.client_id || log.client_name;
      if (!map.has(clientKey)) {
        map.set(clientKey, { title: log.client_name, children: new globalThis.Map() });
      }
      const client = map.get(clientKey)!;
      const projectKey = group === "all" ? log.project_id || log.project_name : "_all";
      const list = client.children.get(projectKey) ?? [];
      list.push(log);
      client.children.set(projectKey, list);
    }
    return [...map.values()]
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((client) => ({
        title: client.title,
        subtitle: `${[...client.children.values()].reduce((s, l) => s + l.length, 0)} logs`,
        logs: [] as TimeLogRow[],
        projects: [...client.children.entries()].map(([key, projectLogs]) => ({
          title: key === "_all" ? "All projects" : projectLogs[0]?.project_name || "Project",
          logs: projectLogs,
        })),
      }));
  }, [logs, group]);

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-12 text-center text-[var(--text-muted)]">
        No time logs for this period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {group === "project"
        ? (branches as { title: string; subtitle: string; logs: TimeLogRow[] }[]).map((node) => {
            const mins = node.logs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
            return (
              <div key={node.title + node.subtitle} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{node.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">{node.subtitle}</p>
                  </div>
                  <span className="font-mono text-sm text-[var(--accent-text)]">{formatLogMins(mins)}</span>
                </div>
                <div className="relative ml-3 space-y-2 border-l border-[var(--border)] pl-4">
                  {node.logs.map((log) => (
                    <MapLogCard
                      key={log.id}
                      log={log}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      deletingId={deletingId}
                    />
                  ))}
                </div>
              </div>
            );
          })
        : (branches as unknown as { title: string; subtitle: string; projects: { title: string; logs: TimeLogRow[] }[] }[]).map(
            (client) => {
              const mins = client.projects.reduce(
                (s, p) => s + p.logs.reduce((n, l) => n + (l.duration_minutes ?? 0), 0),
                0
              );
              return (
                <div key={client.title} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">{client.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">{client.subtitle}</p>
                    </div>
                    <span className="font-mono text-sm text-[var(--accent-text)]">{formatLogMins(mins)}</span>
                  </div>
                  <div className="relative ml-3 space-y-4 border-l border-[var(--border)] pl-4">
                    {client.projects.map((project) => {
                      const pMins = project.logs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
                      return (
                        <div key={project.title}>
                          {group === "all" && (
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {project.title}
                              </span>
                              <span className="font-mono text-xs text-[var(--text-muted)]">
                                {formatLogMins(pMins)}
                              </span>
                            </div>
                          )}
                          <div className="space-y-2">
                            {project.logs.map((log) => (
                              <MapLogCard
                                key={log.id}
                                log={log}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                deletingId={deletingId}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          )}
    </div>
  );
}

function MapLogCard({
  log,
  onEdit,
  onDelete,
  deletingId,
}: {
  log: TimeLogRow;
  onEdit: (log: TimeLogRow) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const timezone = useTimezone();
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2">
      <button type="button" onClick={() => onEdit(log)} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm text-[var(--text-primary)]">
          {log.description || log.project_name}
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {log.started_at
            ? formatDateOnly(formatInstantAsLocalDate(log.started_at, timezone), {
                year: "numeric",
              })
            : "—"}
          {" · "}
          {log.duration_minutes} min
          {log.is_billed ? " · billed" : log.is_billable ? " · billable" : " · non-billable"}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onDelete(log.id)}
        disabled={deletingId === log.id || log.is_billed}
        className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-red-500/20 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
        title={log.is_billed ? "Cannot delete billed log" : "Delete"}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
