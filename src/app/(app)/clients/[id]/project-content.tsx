"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProjectSlideOver } from "@/components/project-slide-over";
import { InviteToPortalSlideOver } from "@/components/invite-to-portal-slide-over";
import { InviteActions } from "@/components/invite-actions";
import { deleteProject } from "@/app/actions/projects";
import {
  createTask,
  updateTask,
  deleteTask,
  getTaskTimeLogCount,
} from "@/app/actions/clients-projects";
import type { ProjectListItem } from "@/types/database";
import type { ClientInviteRow } from "@/app/actions/client-invites";
import { getServicesForSelect } from "@/app/actions/services";

type TaskRow = { id: string; name: string; serviceId?: string | null; serviceName?: string | null };
type ServiceOpt = { id: string; name: string };

type Client = {
  id: string;
  name: string;
  email: string | null;
  tax_id: string | null;
  currency: string;
  address?: string | null;
  phone_number?: string | null;
  business_phone?: string | null;
  extension?: string | null;
  note?: string | null;
};

type ProjectEffectiveRate = {
  projectId: string;
  projectName: string;
  revenue: number;
  totalHours: number;
  effectiveRate: number | null;
};

export function ProjectContent({
  client,
  projects,
  tasksByProject,
  invites,
  effectiveRatesByProject = new Map<string, ProjectEffectiveRate>(),
}: {
  client: Client;
  projects: ProjectListItem[];
  tasksByProject: Record<string, TaskRow[]>;
  invites: ClientInviteRow[];
  effectiveRatesByProject?: Map<string, ProjectEffectiveRate>;
}) {
  const router = useRouter();
  const [slideOpen, setSlideOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectListItem | null>(null);
  const [addingTaskProjectId, setAddingTaskProjectId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskServiceId, setNewTaskServiceId] = useState("");
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState("");
  const [editingTaskServiceId, setEditingTaskServiceId] = useState("");

  async function handleDelete(projectId: string) {
    if (!confirm("Delete this project?")) return;
    await deleteProject(projectId, client.id);
    router.refresh();
  }

  function openAdd() {
    setEditing(null);
    setSlideOpen(true);
  }

  function openEdit(project: ProjectListItem) {
    setEditing(project);
    setSlideOpen(true);
  }

  useEffect(() => {
    getServicesForSelect().then(setServices);
  }, []);

  async function handleAddTask(projectId: string) {
    if (!newTaskName.trim() || !newTaskServiceId) return;
    const r = await createTask(projectId, newTaskServiceId, newTaskName.trim());
    if (r?.error) {
      alert(r.error);
      return;
    }
    setAddingTaskProjectId(null);
    setNewTaskName("");
    setNewTaskServiceId("");
    router.refresh();
  }

  function startEditTask(task: TaskRow) {
    setEditingTaskId(task.id);
    setEditingTaskName(task.name);
    setEditingTaskServiceId(task.serviceId ?? "");
  }

  async function handleUpdateTask(projectId: string) {
    if (!editingTaskId) return;
    const updates: { name?: string; serviceId?: string } = {};
    if (editingTaskName.trim()) updates.name = editingTaskName.trim();
    if (editingTaskServiceId) updates.serviceId = editingTaskServiceId;
    const r = await updateTask(projectId, editingTaskId, updates);
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
        href="/clients"
        className="text-sm text-[var(--text-secondary)] hover:text-accent mb-4 inline-block"
      >
        ← Back to Clients & Projects
      </Link>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <div className="mt-1 space-y-0.5 text-sm text-[var(--text-secondary)]">
            {client.email && <p>{client.email}</p>}
            {client.address && <p>{client.address}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-0 text-xs text-[var(--text-muted)]">
              {client.phone_number && <span>Phone: {client.phone_number}</span>}
              {client.business_phone && (
                <span>Business: {client.business_phone}{client.extension ? ` ext. ${client.extension}` : ""}</span>
              )}
              <span>{client.currency}</span>
              {client.tax_id && <span>Tax ID: {client.tax_id}</span>}
            </div>
            {client.note && (
              <p className="mt-2 text-xs text-[var(--text-muted)] italic">{client.note}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          >
            Invite to portal
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg text-sm w-fit"
          >
            Add Project
          </button>
        </div>
      </header>

      {invites.length > 0 && (
        <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">
            Portal invites
          </h3>
          <ul className="space-y-2 text-sm">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3">
                <span className="text-[var(--text-primary)]">{inv.email}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      inv.status === "accepted"
                        ? "text-success"
                        : "text-[var(--text-muted)]"
                    }
                  >
                    {inv.status === "accepted" ? "Accepted" : "Pending"}
                  </span>
                  {inv.status === "pending" && (
                    <InviteActions inviteId={inv.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InviteToPortalSlideOver
        clientId={client.id}
        clientName={client.name}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      <ProjectSlideOver
        open={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          setEditing(null);
          router.refresh();
        }}
        clientId={client.id}
        project={editing}
      />

      <div className="mt-6">
        {projects.length === 0 ? (
          <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-xl p-12 text-center">
            <p className="text-[var(--text-muted)] mb-4">
              No projects yet. Add a project to start tracking time.
            </p>
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg"
            >
              Add Project
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const tasks = tasksByProject[project.id] ?? [];
              const isAddingTask = addingTaskProjectId === project.id;
              return (
                <div
                  key={project.id}
                  className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-xl overflow-hidden"
                >
                  <Link
                    href={`/clients/${client.id}/projects/${project.id}`}
                    className="block p-4 flex items-center justify-between group hover:bg-white/[0.02] transition-colors"
                  >
                    <div>
                      <h3 className="font-semibold">{project.name}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {project.billing_type === "hourly"
                          ? project.hourly_rate != null
                            ? `$${project.hourly_rate}/hr`
                            : "Hourly (no rate)"
                          : "Fixed price"}
                        {" · "}
                        <span
                          className={
                            project.status === "active"
                              ? "text-success"
                              : "text-[var(--text-muted)]"
                          }
                        >
                          {project.status}
                        </span>
                        {(() => {
                          const rate = effectiveRatesByProject.get(project.id);
                          return rate?.effectiveRate != null ? (
                            <span className="ml-2 text-emerald-400">
                              · ${rate.effectiveRate.toFixed(0)}/hr effective
                            </span>
                          ) : null;
                        })()}
                      </p>
                    </div>
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          openEdit(project);
                        }}
                        className="text-sm text-accent hover:underline cursor-pointer"
                      >
                        Edit
                      </span>
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          handleDelete(project.id);
                        }}
                        className="text-sm text-red-400 hover:underline cursor-pointer"
                      >
                        Delete
                      </span>
                    </div>
                  </Link>
                  <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--bg-app)]/50">
                    <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      Tasks
                    </h4>
                    {tasks.length === 0 && !isAddingTask ? (
                      <p className="text-sm text-[var(--text-muted)] mb-2">
                        No tasks yet.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 mb-2">
                        {tasks.map((task) => (
                          <li
                            key={task.id}
                            className="flex items-center justify-between gap-2 group/task"
                          >
                            {editingTaskId === task.id ? (
                              <div className="flex gap-2 flex-1 flex-wrap">
                                <input
                                  type="text"
                                  value={editingTaskName}
                                  onChange={(e) => setEditingTaskName(e.target.value)}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    handleUpdateTask(project.id)
                                  }
                                  className="min-w-[120px] flex-1 rounded border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1 text-sm"
                                  placeholder="Task name"
                                />
                                <select
                                  value={editingTaskServiceId}
                                  onChange={(e) => setEditingTaskServiceId(e.target.value)}
                                  className="rounded border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1 text-sm"
                                >
                                  <option value="">Service</option>
                                  {services.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateTask(project.id)
                                  }
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
                                <span className="text-sm text-[var(--text-primary)]">
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
                    {isAddingTask ? (
                      <div className="flex gap-2 flex-wrap">
                        <select
                          value={newTaskServiceId}
                          onChange={(e) => setNewTaskServiceId(e.target.value)}
                          className="rounded border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-sm"
                        >
                          <option value="">Service *</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={newTaskName}
                          onChange={(e) => setNewTaskName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddTask(project.id)
                          }
                          placeholder="Task name"
                          className="min-w-[120px] flex-1 rounded border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-sm"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTask(project.id)}
                          className="px-3 py-1.5 rounded bg-accent text-white text-sm font-medium hover:bg-accent-hover"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingTaskProjectId(null);
                            setNewTaskName("");
                            setNewTaskServiceId("");
                          }}
                          className="text-sm text-[var(--text-muted)] hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingTaskProjectId(project.id)}
                        className="text-sm text-accent hover:underline"
                      >
                        + Add task
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
