"use client";

import { useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { SlideOver } from "./slide-over";
import { updateTimeLog } from "@/app/actions/time-logs";
import { type TimeLogRow } from "@/app/actions/time-logs";
import {
  getClientsForSelect,
  getProjectsByClient,
  getTasksByProjectAndService,
  createTask,
  type TaskOpt,
} from "@/app/actions/clients-projects";
import { getOrgClientsForSelect, getOrgProjectsByClient, createOrgTask } from "@/app/actions/org-tracking";
import { getServicesForSelect } from "@/app/actions/services";
import { useTimezone } from "@/contexts/timezone-context";
import {
  formatInstantAsLocalDate,
  formatInstantAsLocalTime,
  formatProjectOptionLabel,
  localToday,
  timeStringToMinutes,
} from "@/lib/dates";

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

export function EditLogSlideOver({
  log,
  open,
  onClose,
  onSuccess,
  scope = "contractor",
}: {
  log: TimeLogRow | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  scope?: TrackingScope;
}) {
  const timezone = useTimezone();
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [services, setServices] = useState<ServiceOpt[]>([]);
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
  const [hydratedLogId, setHydratedLogId] = useState<string | null>(null);

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
    getServicesForSelect().then((s) => {
      const opts = s.map((x) => ({ id: x.id, name: x.name }));
      // Keep the log's service visible even if options load later or it was archived
      if (
        log?.service_id &&
        !opts.some((o) => o.id === log.service_id)
      ) {
        opts.unshift({
          id: log.service_id,
          name: log.service_name ?? "Current service",
        });
      }
      setServices(opts);
    });
  }, [open, scope, log]);

  useEffect(() => {
    if (!log || !open) return;
    if (hydratedLogId === log.id) return;
    setHydratedLogId(log.id);
    setClientId(log.client_id);
    setProjectId(log.project_id);
    setServiceId(log.service_id ?? "");
    setTaskId(log.task_id ?? "");
    setDate(
      log.started_at ? formatInstantAsLocalDate(log.started_at, timezone) : localToday(timezone)
    );
    setStartTime(
      log.started_at ? formatInstantAsLocalTime(log.started_at, timezone) : "09:00"
    );
    setEndTime(
      log.ended_at
        ? formatInstantAsLocalTime(log.ended_at, timezone)
        : formatInstantAsLocalTime(
            new Date(
              new Date(log.started_at).getTime() + (log.duration_minutes ?? 0) * 60000
            ).toISOString(),
            timezone
          )
    );
    setDescription(log.description ?? "");
    setIsBillable(log.is_billable);
    setError(null);
    setAddingTask(false);
    setNewTaskName("");
  }, [log, open, timezone, hydratedLogId]);

  useEffect(() => {
    if (!open) setHydratedLogId(null);
  }, [open]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      return;
    }
    const load = scope === "org" ? getOrgProjectsByClient : getProjectsByClient;
    load(clientId).then((projs) => {
      setProjects(projs);
      setProjectId((prev) => (projs.some((p) => p.id === prev) ? prev : ""));
    });
  }, [clientId, scope]);

  useEffect(() => {
    if (!projectId || !serviceId) {
      setTasks([]);
      return;
    }
    getTasksByProjectAndService(projectId, serviceId).then((list) => {
      setTasks(list);
      setTaskId((prev) => (list.some((t) => t.id === prev) ? prev : ""));
    });
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

  async function handleSubmit(formData: FormData) {
    if (!log) return;
    const selectedProjectId = (formData.get("project_id") as string) || projectId;
    if (!selectedProjectId) {
      setError("Select client and project.");
      return;
    }
    if (!date || !startTime || !endTime) {
      setError("Date and time are required.");
      return;
    }

    setError(null);
    const result = await updateTimeLog(log.id, {
      project_id: selectedProjectId,
      task_id: taskId || null,
      service_id: serviceId || null,
      date,
      start_time: startTime,
      end_time: endTime,
      description: description.trim() || undefined,
      is_billable: isBillable,
    });
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success("Time log saved");
    onSuccess?.();
    onClose();
  }

  if (!log) return null;

  return (
    <SlideOver open={open} onClose={onClose} title="Edit Log">
      <form action={handleSubmit} className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Client *
            </label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setProjectId("");
                setServiceId("");
                setTaskId("");
              }}
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
              onChange={(e) => {
                setProjectId(e.target.value);
                setServiceId("");
                setTaskId("");
              }}
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
              onChange={(e) => {
                setServiceId(e.target.value);
                setTaskId("");
              }}
              disabled={!projectId}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent disabled:opacity-50"
            >
              <option value="">Select service</option>
              {serviceId && !services.some((s) => s.id === serviceId) && (
                <option value={serviceId}>
                  {log.service_name ?? "Current service"}
                </option>
              )}
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
                      aria-label="New task name"
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
                aria-label="Start time"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              />
              <span className="text-[var(--text-muted)]">–</span>
              <input
                name="end_time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                aria-label="End time"
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Logo concepts"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            />
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
