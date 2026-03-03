"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ProjectSlideOver } from "@/components/project-slide-over";
import { AddTaskSlideOver } from "@/components/add-task-slide-over";
import { ManualLogSlideOver } from "@/components/manual-log-slide-over";
import { CreateInvoiceSlideOver } from "@/components/create-invoice-slide-over";
import { deleteProject } from "@/app/actions/projects";
import {
  updateTask,
  deleteTask,
  getTaskTimeLogCount,
} from "@/app/actions/clients-projects";
import type { ProjectListItem } from "@/types/database";
import { getServicesForSelect } from "@/app/actions/services";

type TaskRow = { id: string | null; name: string; serviceId?: string | null; serviceName?: string | null; totalMinutes: number };
type ServiceOpt = { id: string; name: string };

type Client = {
  id: string;
  name: string;
  email: string | null;
  tax_id: string | null;
  currency: string;
};

export function ProjectDetailContent({
  client,
  project,
  tasks,
  totalMinutes = 0,
}: {
  client: Client;
  project: ProjectListItem;
  tasks: TaskRow[];
  totalMinutes?: number;
}) {
  const router = useRouter();
  const [slideOpen, setSlideOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [manualLogOpen, setManualLogOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState("");
  const [editingTaskServiceId, setEditingTaskServiceId] = useState("");

  async function handleDeleteProject() {
    if (!confirm("Delete this project?")) return;
    await deleteProject(project.id, client.id);
    router.push(`/clients/${client.id}`);
    router.refresh();
  }

  function openEdit() {
    setSlideOpen(true);
  }

  useEffect(() => {
    getServicesForSelect().then(setServices);
  }, []);

  function startEditTask(task: TaskRow) {
    if (!task.id) return;
    setEditingTaskId(task.id);
    setEditingTaskName(task.name);
    setEditingTaskServiceId(task.serviceId ?? "");
  }

  async function handleUpdateTask() {
    if (!editingTaskId) return;
    const updates: { name?: string; serviceId?: string } = {};
    if (editingTaskName.trim()) updates.name = editingTaskName.trim();
    if (editingTaskServiceId) updates.serviceId = editingTaskServiceId;
    const r = await updateTask(project.id, editingTaskId, updates);
    if (r?.error) {
      toast.error(r.error);
      return;
    }
    setEditingTaskId(null);
    setEditingTaskName("");
    setEditingTaskServiceId("");
    router.refresh();
  }

  async function handleDeleteTask(taskId: string | null, taskName: string) {
    if (!taskId) return;
    const { count, totalMinutes } = await getTaskTimeLogCount(taskId);
    const warning =
      count > 0
        ? `This task "${taskName}" has ${count} time log(s) (${totalMinutes} minutes recorded). The time will be kept but unassigned from this task. Delete anyway?`
        : `Delete task "${taskName}"?`;
    if (!confirm(warning)) return;
    const r = await deleteTask(taskId);
    if (r?.error) {
      toast.error(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <nav className="text-sm text-[var(--text-secondary)] mb-4 flex items-center gap-1.5">
        <Link href="/clients" className="hover:text-accent transition-colors">Clients</Link>
        <span>/</span>
        <Link href={`/clients/${client.id}`} className="hover:text-accent transition-colors">{client.name}</Link>
        <span>/</span>
        <span className="text-[var(--text-primary)] font-medium">{project.name}</span>
      </nav>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{project.name}</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            {client.name}
            {client.email && ` · ${client.email}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setManualLogOpen(true)}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-semibold"
          >
            Manual Log
          </button>
          <button
            onClick={() => setCreateInvoiceOpen(true)}
            className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          >
            Generate Invoice
          </button>
          <button
            onClick={openEdit}
            className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          >
            Edit Project
          </button>
          <button
            onClick={handleDeleteProject}
            className="px-4 py-2 border border-red-500/30 rounded-lg text-sm font-semibold text-red-400 hover:bg-red-500/10"
          >
            Delete Project
          </button>
        </div>
      </header>

      <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Hours spent</h3>
        <p className="text-sm text-[var(--text-primary)]">
          {project.estimated_hours != null && project.estimated_hours > 0
            ? `${((totalMinutes ?? 0) / 60).toFixed(1)} out of ${Number(project.estimated_hours).toFixed(1)} hours spent`
            : `${((totalMinutes ?? 0) / 60).toFixed(1)} hours spent`}
        </p>
        {project.estimated_hours != null && project.estimated_hours > 0 && (
          <div className="mt-2 h-2 w-full rounded-full bg-[var(--bg-app)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                ((totalMinutes ?? 0) / 60) / Number(project.estimated_hours) >= 1
                  ? "bg-red-500"
                  : ((totalMinutes ?? 0) / 60) / Number(project.estimated_hours) >= 0.8
                    ? "bg-amber-500"
                    : "bg-accent"
              }`}
              style={{
                width: `${Math.min(100, (((totalMinutes ?? 0) / 60) / Number(project.estimated_hours)) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {project.description && (
        <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Description</h3>
          <div
            className="prose prose-invert prose-sm max-w-none text-[var(--text-primary)] prose-p:my-1 prose-ul:my-2 prose-ol:my-2"
            dangerouslySetInnerHTML={{ __html: project.description }}
          />
        </div>
      )}

      <ProjectSlideOver
        open={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          router.refresh();
        }}
        clientId={client.id}
        project={project}
      />

      <AddTaskSlideOver
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onSuccess={() => router.refresh()}
        projectId={project.id}
        clientId={client.id}
      />

      <ManualLogSlideOver
        open={manualLogOpen}
        onClose={() => {
          setManualLogOpen(false);
          router.refresh();
        }}
        initialClientId={client.id}
        initialProjectId={project.id}
      />

      <CreateInvoiceSlideOver
        open={createInvoiceOpen}
        onClose={() => {
          setCreateInvoiceOpen(false);
          router.refresh();
        }}
        initialClientId={client.id}
        initialProjectId={project.id}
      />

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3 bg-[var(--bg-sidebar)]/50">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
            Tasks
          </h3>
        </div>
        <div className="p-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] mb-3">
              No tasks yet. Add a task manually or log time — tasks will appear as you track.
            </p>
          ) : null}
          {tasks.length > 0 && (
            <ul className="space-y-2 mb-3">
              {tasks.map((task, i) => (
                <li
                  key={task.id ?? `derived-${task.name}-${i}`}
                  className="flex items-center justify-between gap-2 group/task py-2"
                >
                  {editingTaskId != null && editingTaskId === task.id ? (
                    <div className="flex gap-2 flex-1 flex-wrap">
                      <input
                        type="text"
                        value={editingTaskName}
                        onChange={(e) => setEditingTaskName(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleUpdateTask()
                        }
                        className="min-w-[120px] flex-1 rounded border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-sm"
                        placeholder="Task name"
                      />
                      <select
                        value={editingTaskServiceId}
                        onChange={(e) => setEditingTaskServiceId(e.target.value)}
                        className="rounded border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-sm"
                      >
                        <option value="">Service</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleUpdateTask}
                        className="text-sm text-accent hover:underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTaskId(null);
                          setEditingTaskName("");
                        }}
                        className="text-sm text-[var(--text-muted)] hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm text-[var(--text-primary)] font-medium">
                        {task.name}
                        {task.serviceName && (
                          <span className="ml-2 inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            {task.serviceName}
                          </span>
                        )}
                        <span className="ml-2 font-mono text-xs text-[var(--text-secondary)]">
                          Total: {(task.totalMinutes / 60).toFixed(1)}h
                        </span>
                      </span>
                      {task.id ? (
                        <div className="flex gap-2 opacity-0 group-hover/task:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startEditTask(task)}
                            className="text-xs text-accent hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteTask(task.id, task.name)
                            }
                            className="text-xs text-red-400 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setAddTaskOpen(true)}
            className="text-sm text-accent hover:underline"
          >
            + Add task
          </button>
        </div>
      </div>
    </>
  );
}
