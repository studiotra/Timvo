"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { startTimer, stopTimer } from "@/app/actions/time-logs";
import {
  getClientsForTimer,
  getProjectsForTimer,
  getActiveTimer,
  type ClientOption,
  type ProjectOption,
  type ActiveTimer,
} from "@/app/actions/timer";

function formatTime(secs: number) {
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function SidebarTimerWidget() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [activeTimer, setActiveTimer] = useState<ActiveTimer>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    const [clientsList, active] = await Promise.all([
      getClientsForTimer(),
      getActiveTimer(),
    ]);
    setClients(clientsList);
    setActiveTimer(active);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      setSelectedProjectId("");
      return;
    }
    getProjectsForTimer(clientId).then((projs) => {
      setProjects(projs);
      setSelectedProjectId((prev) => {
        const exists = projs.some((p) => p.id === prev);
        return exists ? prev : projs[0]?.id ?? "";
      });
    });
  }, [clientId]);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      return;
    }
    const update = () =>
      setElapsed(
        Math.floor((Date.now() - new Date(activeTimer!.startedAt).getTime()) / 1000)
      );
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [activeTimer]);

  async function handleStop() {
    if (actionLoading || !activeTimer) return;
    setActionLoading(true);
    const r = await stopTimer();
    if (r?.error) alert(r.error);
    else {
      setActiveTimer(null);
      router.refresh();
    }
    setActionLoading(false);
  }

  async function handleStart() {
    if (actionLoading) return;
    const pid = selectedProjectId || projects[0]?.id;
    if (!pid) {
      alert("Add a project first (Clients → select client → Add Project)");
      return;
    }
    setActionLoading(true);
    const r = await startTimer(pid);
    if (r?.error) alert(r.error);
    else if (r?.startedAt) {
      const proj = projects.find((p) => p.id === pid);
      const client = clients.find((c) => c.id === clientId);
      setActiveTimer({
        id: r.logId!,
        projectId: pid,
        projectName: proj?.name ?? "",
        clientName: client?.name ?? "",
        startedAt: r.startedAt,
      });
      router.refresh();
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="mx-3 my-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
        <div className="text-xs text-[var(--text-muted)]">Loading…</div>
      </div>
    );
  }

  if (activeTimer) {
    return (
      <div className="relative mx-3 my-4 overflow-hidden rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 to-indigo-500/5 p-3">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-300">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Active Session
        </div>
        <div className="mb-2 truncate text-[11px] text-[var(--text-secondary)]">
          {activeTimer.projectName}
          {activeTimer.clientName ? ` · ${activeTimer.clientName}` : ""}
        </div>
        <div className="mb-2.5 font-mono text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
          {formatTime(elapsed)}
        </div>
        <button
          type="button"
          onClick={handleStop}
          disabled={actionLoading}
          className="w-full rounded-md border border-red-500/30 bg-red-500/15 px-2 py-1.5 text-[11px] font-semibold text-red-200 transition-colors hover:bg-red-500/25 disabled:opacity-50"
        >
          ■ Stop Timer
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 my-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        Timer
      </div>
      <select
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="mb-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-[11px] text-[var(--text-primary)]"
      >
        <option value="">{clients.length === 0 ? "No clients" : "Select client"}</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={selectedProjectId}
        onChange={(e) => setSelectedProjectId(e.target.value)}
        disabled={!clientId}
        className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] disabled:opacity-50"
      >
        <option value="">{projects.length === 0 ? "No projects" : "Select project"}</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleStart}
        disabled={actionLoading || !clientId || projects.length === 0}
        className="w-full rounded-lg bg-accent px-2 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        ▶ Start Timer
      </button>
    </div>
  );
}
