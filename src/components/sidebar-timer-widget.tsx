"use client";

import { toast } from "sonner";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { startTimer, stopTimer } from "@/app/actions/time-logs";
import {
  getClientsForTimer,
  getProjectsForTimer,
  getServicesForTimer,
  getTasksForTimer,
  createTask,
  getActiveTimer,
  type ClientOption,
  type ProjectOption,
  type ServiceOption,
  type TaskOpt,
  type ActiveTimer,
} from "@/app/actions/timer";

const TIMER_SELECTION_KEY = "timvo-timer-selection";

type SavedSelection = {
  clientId: string;
  projectId: string;
  serviceId: string;
  taskId: string;
};

function readSavedSelection(): SavedSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TIMER_SELECTION_KEY);
    return raw ? (JSON.parse(raw) as SavedSelection) : null;
  } catch {
    return null;
  }
}

function writeSavedSelection(value: SavedSelection) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TIMER_SELECTION_KEY, JSON.stringify(value));
}

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
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [tasks, setTasks] = useState<TaskOpt[]>([]);
  const [clientId, setClientId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [activeTimer, setActiveTimer] = useState<ActiveTimer>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const restoredRef = useRef(false);

  const load = useCallback(async () => {
    const [clientsList, servicesList, active] = await Promise.all([
      getClientsForTimer(),
      getServicesForTimer(),
      getActiveTimer(),
    ]);
    setClients(clientsList);
    setServices(servicesList);
    setActiveTimer(active);
    setLoading(false);

    if (!restoredRef.current) {
      restoredRef.current = true;
      const saved = readSavedSelection();
      if (saved?.clientId && clientsList.some((c) => c.id === saved.clientId)) {
        setClientId(saved.clientId);
        setSelectedProjectId(saved.projectId);
        setServiceId(saved.serviceId);
        setTaskId(saved.taskId);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    writeSavedSelection({
      clientId,
      projectId: selectedProjectId,
      serviceId,
      taskId,
    });
  }, [clientId, selectedProjectId, serviceId, taskId]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      setSelectedProjectId("");
      setTasks([]);
      setTaskId("");
      return;
    }
    let cancelled = false;
    getProjectsForTimer(clientId).then((projs) => {
      if (cancelled) return;
      setProjects(projs);
      setSelectedProjectId((prev) => {
        if (prev && projs.some((p) => p.id === prev)) return prev;
        const saved = readSavedSelection();
        if (saved?.projectId && projs.some((p) => p.id === saved.projectId)) {
          return saved.projectId;
        }
        return projs[0]?.id ?? "";
      });
    });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      setTaskId("");
      return;
    }
    let cancelled = false;
    getTasksForTimer(selectedProjectId, serviceId || undefined).then((list) => {
      if (cancelled) return;
      setTasks(list);
      setTaskId((prev) => (list.some((t) => t.id === prev) ? prev : ""));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, serviceId]);

  async function handleAddTask() {
    if (!newTaskName.trim() || !selectedProjectId || !serviceId) return;
    const r = await createTask(selectedProjectId, serviceId, newTaskName.trim());
    if (r?.error) {
      toast.error(r.error);
      return;
    }
    if (r?.task) {
      setTasks((prev) => [...prev, r.task].sort((a, b) => a.name.localeCompare(b.name)));
      setTaskId(r.task.id);
      setNewTaskName("");
      setAddingTask(false);
    }
  }

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
    if (r?.error) toast.error(r.error);
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
      toast.error("Add a project first (Clients & Projects → select client → Add Project)");
      return;
    }
    if (!serviceId && services.length > 0) {
      toast.error("Select a service type (e.g. Design, Development) to record time at the correct rate.");
      return;
    }
    setActionLoading(true);
    const r = await startTimer(pid, { taskId: taskId || undefined });
    if (r?.error) toast.error(r.error);
    else if (r?.startedAt) {
      const proj = projects.find((p) => p.id === pid);
      const client = clients.find((c) => c.id === clientId);
      const task = tasks.find((t) => t.id === taskId);
      setActiveTimer({
        id: r.logId!,
        projectId: pid,
        projectName: proj?.name ?? "",
        clientName: client?.name ?? "",
        taskName: task?.name,
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
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent-text)]">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Active Session
        </div>
        <div className="mb-2 truncate text-[11px] text-[var(--text-secondary)]">
          {activeTimer.taskName ? `${activeTimer.taskName} · ` : ""}
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
          className="w-full rounded-md border border-red-500/30 bg-red-500/15 px-2 py-1.5 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
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
        onChange={(e) => {
          setClientId(e.target.value);
          setSelectedProjectId("");
          setServiceId("");
          setTaskId("");
          setTasks([]);
        }}
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
        onChange={(e) => {
          setSelectedProjectId(e.target.value);
          setTaskId("");
        }}
        disabled={!clientId}
        className="mb-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] disabled:opacity-50"
      >
        <option value="">{projects.length === 0 ? "No projects" : "Select project"}</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        value={serviceId}
        onChange={(e) => setServiceId(e.target.value)}
        disabled={!selectedProjectId}
        className="mb-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] disabled:opacity-50"
      >
        <option value="">
          {services.length === 0 ? "Add services first (Settings)" : "Service type *"}
        </option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.default_rate != null
              ? s.billing_type === "fixed"
                ? ` · $${s.default_rate} flat`
                : ` · $${s.default_rate}/hr`
              : ""}
          </option>
        ))}
      </select>
      <div className="mb-2 space-y-1">
        <select
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          disabled={!selectedProjectId}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] disabled:opacity-50"
        >
          <option value="">Task (optional)</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {selectedProjectId && serviceId && (
          addingTask ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTask())}
                placeholder="Task name"
                className="flex-1 rounded border border-[var(--border)] bg-[var(--bg-app)] px-1.5 py-1 text-[11px] text-[var(--text-primary)]"
              />
              <button
                type="button"
                onClick={handleAddTask}
                className="rounded bg-accent px-2 py-1 text-[10px] text-white"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAddingTask(false); setNewTaskName(""); }}
                className="text-[10px] text-[var(--text-muted)]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingTask(true)}
              className="text-[10px] text-accent hover:underline"
            >
              + New task
            </button>
          )
        )}
      </div>
      <button
        type="button"
        onClick={handleStart}
        disabled={actionLoading || !clientId || projects.length === 0 || !serviceId}
        className="w-full rounded-lg bg-accent px-2 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        ▶ Start Timer
      </button>
    </div>
  );
}
