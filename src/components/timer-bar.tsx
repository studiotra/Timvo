"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { startTimer, stopTimer } from "@/app/actions/time-logs";
import {
  getProjectsForTimer,
  getActiveTimer,
  type ProjectOption,
  type ActiveTimer,
} from "@/app/actions/timer";

export function TimerBar() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    const [projs, active] = await Promise.all([
      getProjectsForTimer(),
      getActiveTimer(),
    ]);
    setProjects(projs);
    setActiveTimer(active);
    setSelectedProjectId((prev) => (prev || projs[0]?.id) ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const elapsed =
    activeTimer != null
      ? Math.floor(
          (Date.now() - new Date(activeTimer.startedAt).getTime()) / 1000
        )
      : 0;
  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const display = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  async function handleToggle() {
    if (actionLoading) return;
    setActionLoading(true);
    if (activeTimer) {
      const r = await stopTimer();
      if (r?.error) alert(r.error);
      else {
        setActiveTimer(null);
        router.refresh();
      }
    } else {
      const pid = selectedProjectId || projects[0]?.id;
      if (!pid) {
        alert("Add a project first (Clients → select client → Add Project)");
        setActionLoading(false);
        return;
      }
      const r = await startTimer(pid);
      if (r?.error) alert(r.error);
      else if (r?.startedAt) {
        const proj = projects.find((p) => p.id === pid);
        setActiveTimer({
          id: r.logId!,
          projectId: pid,
          projectName: proj?.name ?? "",
          clientName: proj?.clientName ?? "",
          startedAt: r.startedAt,
        });
        router.refresh();
      }
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <header className="bg-[var(--bg-card)] backdrop-blur-xl border-b border-[var(--border)] px-6 py-3">
        <div className="text-sm text-[var(--text-muted)]">Loading timer…</div>
      </header>
    );
  }

  return (
    <header className="timer-bar no-print bg-[var(--bg-card)] backdrop-blur-xl border-b border-[var(--border)] px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={actionLoading}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {actionLoading
            ? "..."
            : activeTimer
              ? "■ Stop"
              : "▶ Start Timer"}
        </button>
        <span className="font-mono text-lg font-medium text-[var(--text-primary)]">
          {activeTimer ? display : "00:00:00"}
        </span>
        <span className="text-[var(--text-muted)] text-sm">|</span>
        <select
          value={activeTimer?.projectId ?? selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          disabled={!!activeTimer}
          className="px-3 py-1.5 bg-transparent border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] min-w-[180px] disabled:opacity-70"
        >
          <option value="">
            {projects.length === 0 ? "No projects" : "Select project"}
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
