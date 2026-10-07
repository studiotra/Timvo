"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProjectSlideOver } from "@/components/project-slide-over";
import { ClientSlideOver } from "@/components/client-slide-over";
import { ShareProjectToOrgButton } from "@/components/share-project-to-org-button";
import { deleteProject } from "@/app/actions/projects";
import type { ProjectListItem } from "@/types/database";
import type { ContractorOrgOption } from "@/app/actions/organizations";
import type { ProjectShareStatus } from "@/app/actions/project-shares";
import type { ClientSummary } from "@/lib/clients/summary";
import { formatCurrencyAmount } from "@/lib/clients/summary";

type ProjectWithCreated = ProjectListItem & { created_at?: string };
type ProjectEffectiveRate = {
  projectId: string;
  projectName: string;
  revenue: number;
  totalHours: number;
  effectiveRate: number | null;
};

type SortOption = "name-asc" | "name-desc" | "created-desc" | "created-asc";
type StatusFilter = "active" | "archived" | "all";

function projectRateLabel(project: ProjectListItem): ReactNode {
  if (project.billing_type === "fixed") {
    return project.agreed_fee != null
      ? `Fixed · $${Number(project.agreed_fee).toLocaleString("en-CA")}`
      : "Fixed price";
  }
  if (project.hourly_rate != null && Number(project.hourly_rate) > 0) {
    return `$${Number(project.hourly_rate)}/hr`;
  }
  return (
    <>
      Hourly · rates from{" "}
      <Link
        href="/services"
        className="text-accent hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        Services
      </Link>
    </>
  );
}

export function ProjectContent({
  client,
  projects,
  organizations = [],
  sharesByProject = {},
  effectiveRatesByProject = new Map<string, ProjectEffectiveRate>(),
  summary,
}: {
  client: {
    id: string;
    name: string;
    email: string | null;
    tax_id: string | null;
    currency: string;
    status?: "active" | "archived";
    address?: string | null;
    phone_number?: string | null;
    business_phone?: string | null;
    extension?: string | null;
    note?: string | null;
  };
  projects: ProjectWithCreated[];
  organizations?: ContractorOrgOption[];
  sharesByProject?: Record<string, ProjectShareStatus[]>;
  effectiveRatesByProject?: Map<string, ProjectEffectiveRate>;
  summary?: ClientSummary;
}) {
  const router = useRouter();
  const [slideOpen, setSlideOpen] = useState(false);
  const [clientEditOpen, setClientEditOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectListItem | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const filteredProjects = useMemo(() => {
    if (statusFilter === "all") return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  const sortedProjects = useMemo(() => {
    const arr = [...filteredProjects];
    switch (sortBy) {
      case "name-asc":
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return arr.sort((a, b) => b.name.localeCompare(a.name));
      case "created-desc":
        return arr.sort((a, b) => {
          const aAt = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bAt = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bAt - aAt;
        });
      case "created-asc":
        return arr.sort((a, b) => {
          const aAt = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bAt = b.created_at ? new Date(b.created_at).getTime() : 0;
          return aAt - bAt;
        });
      default:
        return arr;
    }
  }, [filteredProjects, sortBy]);

  const existingNames = projects.map((p) => p.name);

  async function handleDelete(projectId: string) {
    if (!confirm("Delete this project?")) return;
    const result = await deleteProject(projectId, client.id);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Project deleted");
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

  return (
    <>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{client.name}</h1>
          <div className="mt-1 space-y-0.5 text-sm text-[var(--text-secondary)]">
            {client.email && <p>{client.email}</p>}
            {client.address && <p>{client.address}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-0 text-xs text-[var(--text-muted)]">
              {client.phone_number && <span>Phone: {client.phone_number}</span>}
              {client.business_phone && (
                <span>
                  Business: {client.business_phone}
                  {client.extension ? ` ext. ${client.extension}` : ""}
                </span>
              )}
              <span>{client.currency}</span>
              {client.tax_id && <span>Tax ID: {client.tax_id}</span>}
            </div>
            {client.note && (
              <p className="mt-2 text-xs italic text-[var(--text-muted)]">{client.note}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            onClick={() => setClientEditOpen(true)}
            className="w-fit rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          >
            Edit
          </button>
          <button
            onClick={openAdd}
            className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Add Project
          </button>
        </div>
      </header>

      {summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Hours
            </p>
            <p className="mt-1 font-mono text-xl text-[var(--text-primary)]">
              {summary.totalHours.toFixed(1)}h
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Unbilled
            </p>
            <p className="mt-1 font-mono text-xl text-[var(--text-primary)]">
              {formatCurrencyAmount(summary.unbilledAmount, client.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Invoices
            </p>
            <p className="mt-1 font-mono text-xl text-[var(--text-primary)]">
              {formatCurrencyAmount(summary.invoiceTotal, client.currency)}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {formatCurrencyAmount(summary.paidInvoiceTotal, client.currency)}{" "}
              paid
            </p>
          </div>
        </div>
      )}

      <ClientSlideOver
        open={clientEditOpen}
        onClose={() => setClientEditOpen(false)}
        onSuccess={() => router.refresh()}
        client={{
          id: client.id,
          name: client.name,
          email: client.email,
          tax_id: client.tax_id,
          currency: client.currency,
          status: client.status ?? "active",
          address: client.address ?? null,
          phone_number: client.phone_number ?? null,
          business_phone: client.business_phone ?? null,
          extension: client.extension ?? null,
          note: client.note ?? null,
          project_count: projects.length,
        }}
      />

      <ProjectSlideOver
        open={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          setEditing(null);
        }}
        onSuccess={() => router.refresh()}
        clientId={client.id}
        project={editing}
        existingNames={existingNames}
      />

      <div className="mt-6">
        {projects.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center backdrop-blur-xl">
            <p className="mb-1 font-medium text-[var(--text-secondary)]">No projects yet</p>
            <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--text-muted)]">
              Add a project, share it with an agency, then submit time for approval.
            </p>
            <button
              onClick={openAdd}
              className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              + Add Project
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--text-secondary)]">
                {sortedProjects.length} project
                {sortedProjects.length !== 1 ? "s" : ""}
                {statusFilter !== "all" ? ` · ${statusFilter}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StatusFilter)
                  }
                  aria-label="Filter by status"
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="all">All</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Sort projects"
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
                >
                  <option value="name-asc">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                  <option value="created-desc">Newest first</option>
                  <option value="created-asc">Oldest first</option>
                </select>
              </div>
            </div>
            {sortedProjects.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  No {statusFilter} projects. Try another status filter.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between gap-3 p-4">
                      <Link
                        href={`/clients/${client.id}/projects/${project.id}`}
                        className="min-w-0 flex-1 transition-colors hover:opacity-90"
                      >
                        <h3
                          className="font-semibold truncate"
                          title={project.name}
                        >
                          {project.name}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] truncate">
                          {projectRateLabel(project)}
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
                      </Link>
                      <div className="flex shrink-0 items-center gap-2">
                        <ShareProjectToOrgButton
                          projectId={project.id}
                          organizations={organizations}
                          existingShares={sharesByProject[project.id] ?? []}
                        />
                        <button
                          type="button"
                          onClick={() => openEdit(project)}
                          className="text-sm text-accent hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(project.id)}
                          className="text-sm text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
