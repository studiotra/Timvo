"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useFormStatus } from "react-dom";
import { SlideOver } from "./slide-over";
import { addManualLog } from "@/app/actions/time-logs";
import { getClientsForSelect, getProjectsByClient, getTasksByProjectAndService, createTask, type TaskOpt } from "@/app/actions/clients-projects";
import { getServicesForSelect } from "@/app/actions/services";

type ClientOpt = { id: string; name: string };
type ProjectOpt = { id: string; name: string; client_id: string };
type ServiceOpt = { id: string; name: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg disabled:opacity-50"
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
}: {
  open: boolean;
  onClose: () => void;
  initialClientId?: string;
  initialProjectId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [tasks, setTasks] = useState<TaskOpt[]>([]);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const initializingRef = useRef(false);
  const restoringFromStorageRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    getClientsForSelect().then(setClients);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initialClientId && initialProjectId) {
      initializingRef.current = true;
      setClientId(initialClientId);
      setProjectId(initialProjectId);
      getProjectsByClient(initialClientId).then((projs) => {
        setProjects(projs);
        initializingRef.current = false;
      });
      return;
    }
    try {
      const savedClient = typeof window !== "undefined" ? localStorage.getItem("manualLog_lastClient") : null;
      const savedProject = typeof window !== "undefined" ? localStorage.getItem("manualLog_lastProject") : null;
      if (savedClient && savedProject) {
        restoringFromStorageRef.current = true;
        setClientId(savedClient);
        setProjectId(savedProject);
        getProjectsByClient(savedClient).then((projs) => {
          setProjects(projs);
          restoringFromStorageRef.current = false;
        });
        return;
      }
    } catch (_) {}
    setClientId("");
    setProjectId("");
    setServiceId("");
    setTaskId("");
  }, [open, initialClientId, initialProjectId]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      setProjectId("");
      setServiceId("");
      setTasks([]);
      setTaskId("");
      return;
    }
    if (initializingRef.current || restoringFromStorageRef.current) return;
    getProjectsByClient(clientId).then(setProjects);
    setProjectId("");
    setServiceId("");
    setTasks([]);
    setTaskId("");
  }, [clientId]);

  useEffect(() => {
    if (!projectId) {
      setServiceId("");
      setTasks([]);
      setTaskId("");
      return;
    }
    setServiceId("");
    setTasks([]);
    setTaskId("");
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !serviceId) {
      setTasks([]);
      setTaskId("");
      return;
    }
    getTasksByProjectAndService(projectId, serviceId).then(setTasks);
    setTaskId("");
  }, [projectId, serviceId]);

  useEffect(() => {
    if (!open) return;
    getServicesForSelect().then((s) => setServices(s.map((x) => ({ id: x.id, name: x.name }))));
  }, [open]);


  async function handleAddTask() {
    if (!newTaskName.trim() || !projectId || !serviceId) return;
    const r = await createTask(projectId, serviceId, newTaskName.trim());
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

  const servicesForDatalist = services;

  async function handleSubmit(formData: FormData) {
    const projectId = formData.get("project_id") as string;
    if (!projectId) {
      setError("Select client and project.");
      return;
    }
    setError(null);
    const result = await addManualLog(formData);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (typeof window !== "undefined" && clientId) {
      try {
        localStorage.setItem("manualLog_lastClient", clientId);
        localStorage.setItem("manualLog_lastProject", projectId);
      } catch (_) {}
    }
    toast.success("Time log added");
    onClose();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <SlideOver open={open} onClose={onClose} title="Add Manual Log">
      <form action={handleSubmit} className="flex flex-col h-full">
        <div className="p-5 space-y-4 flex-1">
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
                  {p.name}
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
                  <span className="flex gap-1 flex-1">
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
                      className="rounded bg-accent px-2 py-1 text-white text-sm"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingTask(false); setNewTaskName(""); }}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      ✕
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTask(true)}
                    className="text-sm text-accent hover:underline whitespace-nowrap"
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
              defaultValue={today}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            />
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
                defaultValue="09:00"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              />
              <span className="text-[var(--text-muted)]">–</span>
              <input
                name="end_time"
                type="time"
                required
                defaultValue="17:00"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Description
            </label>
            <input
              name="description"
              list="services-list"
              placeholder="e.g. Logo concepts"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent"
            />
            {servicesForDatalist.length > 0 && (
              <datalist id="services-list">
                {servicesForDatalist.map((s) => (
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
                defaultChecked
                className="accent-accent"
              />
              <span className="text-sm">Billable</span>
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="is_billable"
                value="false"
                className="accent-accent"
              />
              <span className="text-sm">Non-billable</span>
            </label>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--border)] p-5">
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
