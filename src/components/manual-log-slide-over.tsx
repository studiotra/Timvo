"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useFormStatus } from "react-dom";
import { SlideOver } from "./slide-over";
import { addManualLog } from "@/app/actions/time-logs";
import {
  getClientsForSelect,
  getProjectsByClient,
  getTasksByProjectAndService,
  createTask,
  type TaskOpt,
} from "@/app/actions/clients-projects";
import {
  getOrgClientsForSelect,
  getOrgProjectsByClient,
  createOrgTask,
} from "@/app/actions/org-tracking";
import { getServicesForSelect } from "@/app/actions/services";
import { useTimezone } from "@/contexts/timezone-context";
import { formatProjectOptionLabel, localToday, timeStringToMinutes } from "@/lib/dates";

type TrackingScope = "contractor" | "org";

type ClientOpt = { id: string; name: string };
type ProjectOpt = { id: string; name: string; client_id: string };
type ServiceOpt = { id: string; name: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg disabled:opacity-50 disabled:pointer-events-none"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

export function ManualLogSlideOver({
  open,
  onClose,
  initialClientId,
  initialProjectId,
  scope = "contractor",
}: {
  open: boolean;
  onClose: () => void;
  initialClientId?: string;
  initialProjectId?: string;
  scope?: TrackingScope;
}) {
  const timezone = useTimezone();
  const storagePrefix = scope === "org" ? "orgManualLog" : "manualLog";
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [tasks, setTasks] = useState<TaskOpt[]>([]);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [description, setDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const initializingRef = useRef(false);
  const restoringFromStorageRef = useRef(false);
  const skipClientEffectRef = useRef(false);

  const selectedClientName = clients.find((c) => c.id === clientId)?.name ?? "";
  const today = localToday(timezone);
  const futureWarning = date && date > today ? "This log is dated in the future." : null;
  const startMins = timeStringToMinutes(startTime);
  const endMins = timeStringToMinutes(endTime);
  const overnightHint =
    startMins != null && endMins != null && endMins < startMins
      ? "Ends the next day (overnight)."
      : null;

  useEffect(() => {
    if (!open) return;
    const load = scope === "org" ? getOrgClientsForSelect : getClientsForSelect;
    load().then(setClients);
    getServicesForSelect().then((s) => setServices(s.map((x) => ({ id: x.id, name: x.name }))));
  }, [open, scope]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDate(localToday(timezone));
    setStartTime("09:00");
    setEndTime("17:00");
    setDescription("");
    setIsBillable(true);
    setAddingTask(false);
    setNewTaskName("");

    if (initialClientId && initialProjectId) {
      initializingRef.current = true;
      skipClientEffectRef.current = true;
      setClientId(initialClientId);
      setProjectId(initialProjectId);
      setServiceId("");
      setTaskId("");
      (scope === "org" ? getOrgProjectsByClient : getProjectsByClient)(initialClientId).then(
        (projs) => {
          setProjects(projs);
          initializingRef.current = false;
        }
      );
      return;
    }
    try {
      const savedClient =
        typeof window !== "undefined"
          ? localStorage.getItem(storagePrefix + "_lastClient")
          : null;
      const savedProject =
        typeof window !== "undefined"
          ? localStorage.getItem(storagePrefix + "_lastProject")
          : null;
      if (savedClient && savedProject) {
        restoringFromStorageRef.current = true;
        skipClientEffectRef.current = true;
        setClientId(savedClient);
        setProjectId(savedProject);
        setServiceId("");
        setTaskId("");
        (scope === "org" ? getOrgProjectsByClient : getProjectsByClient)(savedClient).then(
          (projs) => {
            setProjects(projs);
            restoringFromStorageRef.current = false;
          }
        );
        return;
      }
    } catch {
      /* ignore storage errors */
    }
    setClientId("");
    setProjectId("");
    setServiceId("");
    setTaskId("");
    setProjects([]);
    setTasks([]);
  }, [open, initialClientId, initialProjectId, scope, storagePrefix, timezone]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      setProjectId("");
      setServiceId("");
      setTasks([]);
      setTaskId("");
      return;
    }
    if (skipClientEffectRef.current) {
      skipClientEffectRef.current = false;
      return;
    }
    if (initializingRef.current || restoringFromStorageRef.current) return;
    (scope === "org" ? getOrgProjectsByClient : getProjectsByClient)(clientId).then(setProjects);
    setProjectId("");
    setServiceId("");
    setTasks([]);
    setTaskId("");
  }, [clientId, scope]);

  useEffect(() => {
    if (!projectId || !serviceId) {
      setTasks([]);
      setTaskId("");
      return;
    }
    getTasksByProjectAndService(projectId, serviceId).then(setTasks);
    setTaskId("");
  }, [projectId, serviceId]);

  async function handleAddTask() {
    if (!newTaskName.trim() || !projectId || !serviceId) return;
    const r = await (scope === "org" ? createOrgTask : createTask)(
      projectId,
      serviceId,
      newTaskName.trim()
    );
    if (r?.error) {
      setError(r.error);
      return;
    }
    if (r?.task) {
      setTasks((prev) => [...prev, r.task].sort((a, b) => a.name.localeCompare(b.name)));
      setTaskId(r.task.id);
      setNewTaskName("");
      setAddingTask(false);
    }
  }

  async function handleSubmit() {
    if (!projectId) {
      setError("Select client and project.");
      return;
    }
    if (!date || !startTime || !endTime) {
      setError("Date and time are required.");
      return;
    }

    const formData = new FormData();
    formData.set("project_id", projectId);
    if (taskId) formData.set("task_id", taskId);
    formData.set("date", date);
    formData.set("start_time", startTime);
    formData.set("end_time", endTime);
    formData.set("description", description);
    formData.set("is_billable", isBillable ? "true" : "false");

    setError(null);
    const result = await addManualLog(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (typeof window !== "undefined" && clientId) {
      try {
        localStorage.setItem(storagePrefix + "_lastClient", clientId);
        localStorage.setItem(storagePrefix + "_lastProject", projectId);
      } catch {
        /* ignore storage errors */
      }
    }
    toast.success("Time log added");
    onClose();
  }

  return (
    <SlideOver open={open} onClose={onClose} title="Add Manual Log">
      <form action={handleSubmit} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Client *
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Project *
            </label>
            <select
              name="project_id"
              required
              disabled={!clientId}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent disabled:opacity-50"
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatProjectOptionLabel(p.name, selectedClientName)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Service type (for tasks)
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              disabled={!projectId}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent disabled:opacity-50"
            >
              <option value="">Select service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Task (optional)
            </label>
            <div className="flex gap-2">
              <select
                name="task_id"
                disabled={!projectId || !serviceId}
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent disabled:opacity-50"
              >
                <option value="">No task</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {projectId && serviceId && (
                addingTask ? (
                  <span className="flex flex-1 gap-1">
                    <input
                      type="text"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      placeholder="Task name"
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
                    />
                    <button
                      type="button"
                      onClick={handleAddTask}
                      className="rounded bg-accent px-2 py-1 text-sm text-white"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingTask(false);
                        setNewTaskName("");
                      }}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTask(true)}
                    className="whitespace-nowrap text-sm text-accent hover:underline"
                  >
                    + New task
                  </button>
                )
              )}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Date *
            </label>
            <input
              name="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            />
            {futureWarning && (
              <p className="mt-1.5 text-sm text-amber-400">{futureWarning}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Time *
            </label>
            <div className="flex items-center gap-2">
              <input
                name="start_time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              />
              <span className="text-[var(--text-muted)]">–</span>
              <input
                name="end_time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              />
            </div>
            {overnightHint && (
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">{overnightHint}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Description
            </label>
            <input
              name="description"
              list="services-list"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Logo concepts"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            />
            {services.length > 0 && (
              <datalist id="services-list">
                {services.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            )}
          </div>
          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="is_billable"
                value="true"
                checked={isBillable}
                onChange={() => setIsBillable(true)}
                className="accent-accent"
              />
              <span className="text-sm">Billable</span>
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="is_billable"
                value="false"
                checked={!isBillable}
                onChange={() => setIsBillable(false)}
                className="accent-accent"
              />
              <span className="text-sm">Non-billable</span>
            </label>
          </div>
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-sidebar)] p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          >
            Cancel
          </button>
          <SubmitButton />
        </div>
      </form>
    </SlideOver>
  );
}
