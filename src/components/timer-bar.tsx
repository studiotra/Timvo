"use client";

import { toast } from "sonner";

import { useState, useEffect, useCallback } from "react";
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

export function TimerBar() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [tasks, setTasks] = useState<TaskOpt[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer>(null);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadClientsAndActive = useCallback(async () => {
    const [c, active] = await Promise.all([
      getClientsForTimer(),
      getActiveTimer(),
    ]);
    setClients(c);
    setActiveTimer(active);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadClientsAndActive();
  }, [loadClientsAndActive]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      setProjectId("");
      setTasks([]);
      setTaskId("");
      return;
    }
    getProjectsForTimer(clientId).then((p) => {
      setProjects(p);
      setProjectId("");
      setTasks([]);
      setTaskId("");
    });
  }, [clientId]);

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      setTaskId("");
      return;
    }
    getTasksForTimer(projectId).then(setTasks);
    getServicesForTimer().then(setServices);
    setTaskId("");
  }, [projectId]);

  useEffect(() => {
    if (services.length > 0 && !serviceId) setServiceId(services[0].id);
  }, [services]);

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

  async function handleAddTask() {
    if (!newTaskName.trim() || !projectId || !serviceId) return;
    const r = await createTask(projectId, serviceId, newTaskName.trim());
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

  async function handleToggle() {
    if (actionLoading) return;
    setActionLoading(true);
    if (activeTimer) {
      const r = await stopTimer();
      if (r?.error) toast.error(r.error);
      else {
        setActiveTimer(null);
        router.refresh();
      }
    } else {
      const pid = projectId || projects[0]?.id;
      if (!pid) {
        toast.error("Select client and project first (Clients → Add Project)");
        setActionLoading(false);
        return;
      }
      const r = await startTimer(pid, { taskId: taskId || undefined });
      if (r?.error) toast.error(r.error);
      else if (r?.startedAt) {
        const proj = projects.find((p) => p.id === pid);
        const task = tasks.find((t) => t.id === taskId);
        setActiveTimer({
          id: r.logId!,
          projectId: pid,
          projectName: proj?.name ?? "",
          clientName: proj?.clientName ?? "",
          taskName: task?.name,
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

        {/* Client > Project > Task */}
        <select
          value={activeTimer ? "" : clientId}
          onChange={(e) => setClientId(e.target.value)}
          disabled={!!activeTimer}
          className="px-3 py-1.5 bg-transparent border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] min-w-[120px] disabled:opacity-70"
        >
          <option value="">Client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={activeTimer ? "" : projectId}
          onChange={(e) => setProjectId(e.target.value)}
          disabled={!!activeTimer || !clientId}
          className="px-3 py-1.5 bg-transparent border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] min-w-[140px] disabled:opacity-70"
        >
          <option value="">Project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <select
            value={activeTimer ? "" : taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={!!activeTimer || !projectId}
            className="px-3 py-1.5 bg-transparent border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] min-w-[140px] disabled:opacity-70"
          >
            <option value="">Task (optional)</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {!activeTimer && projectId && (
            <>
              {addingTask ? (
                <span className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTask())}
                    placeholder="Task name"
                    className="w-28 px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-app)] text-sm text-[var(--text-primary)]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="text-xs px-2 py-1 rounded bg-accent text-white hover:bg-accent-hover"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingTask(false); setNewTaskName(""); }}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingTask(true)}
                  className="text-xs text-accent hover:underline"
                >
                  + New task
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
