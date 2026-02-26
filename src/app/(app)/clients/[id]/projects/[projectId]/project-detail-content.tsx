"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProjectSlideOver } from "@/components/project-slide-over";
import { AddTaskSlideOver } from "@/components/add-task-slide-over";
import { deleteProject } from "@/app/actions/projects";
import {
  updateTask,
  deleteTask,
  getTaskTimeLogCount,
} from "@/app/actions/clients-projects";
import type { ProjectListItem } from "@/types/database";
import { getServicesForSelect } from "@/app/actions/services";

type TaskRow = { id: string; name: string; serviceId?: string | null; serviceName?: string | null };
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
}: {
  client: Client;
  project: ProjectListItem;
  tasks: TaskRow[];
}) {
  const router = useRouter();
  const [slideOpen, setSlideOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
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
      alert(r.error);
      return;
    }
    setEditingTaskId(null);
    setEditingTaskName("");
    setEditingTaskServiceId("");
    router.refresh();
  }

  async function handleDeleteTask(taskId: string, taskName: string) {
    const { count, totalMinutes } = await getTaskTimeLogCount(taskId);
    const warning =
      count > 0
        ? `This task "${taskName}" has ${count} time log(s) (${totalMinutes} minutes recorded). The time will be kept but unassigned from this task. Delete anyway?`
        : `Delete task "${taskName}"?`;
    if (!confirm(warning)) return;
    const r = await deleteTask(taskId);
    if (r?.error) {
      alert(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <>
      <Link
        href={`/clients/${client.id}`}
        className="text-sm text-[var(--text-secondary)] hover:text-accent mb-4 inline-block"
      >
        ← Back to {client.name}
      </Link>
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

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3 bg-[var(--bg-sidebar)]/50">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
            Tasks
          </h3>
        </div>
        <div className="p-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] mb-3">
              No tasks yet.
            </p>
          ) : null}
          {tasks.length > 0 && (
            <ul className="space-y-2 mb-3">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2 group/task py-2"
                >
                  {editingTaskId === task.id ? (
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
                      </span>
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
