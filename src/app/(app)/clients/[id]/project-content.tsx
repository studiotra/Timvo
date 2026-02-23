"use client";

import { useState } from "react";
import Link from "next/link";
import { ProjectSlideOver } from "@/components/project-slide-over";
import { InviteToPortalSlideOver } from "@/components/invite-to-portal-slide-over";
import { InviteActions } from "@/components/invite-actions";
import { deleteProject } from "@/app/actions/projects";
import type { ProjectListItem } from "@/types/database";
import type { ClientInviteRow } from "@/app/actions/client-invites";

type Client = {
  id: string;
  name: string;
  email: string | null;
  tax_id: string | null;
  currency: string;
};

export function ProjectContent({
  client,
  projects,
  invites,
}: {
  client: Client;
  projects: ProjectListItem[];
  invites: ClientInviteRow[];
}) {
  const [slideOpen, setSlideOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectListItem | null>(null);

  async function handleDelete(projectId: string) {
    if (!confirm("Delete this project?")) return;
    await deleteProject(projectId, client.id);
  }

  function openAdd() {
    setEditing(null);
    setSlideOpen(true);
  }

  function openEdit(project: ProjectListItem) {
    setEditing(project);
    setSlideOpen(true);
  }

  return (
    <>
      <Link
        href="/clients"
        className="text-sm text-[var(--text-secondary)] hover:text-accent mb-4 inline-block"
      >
        ← Back to Clients
      </Link>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.email && (
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              {client.email}
            </p>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {client.currency}
            {client.tax_id && ` · Tax ID: ${client.tax_id}`}
          </p>
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
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border)] rounded-xl p-4 flex items-center justify-between group"
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
                  </p>
                </div>
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(project)}
                    className="text-sm text-accent hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-sm text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
