"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ServiceSlideOver } from "@/components/service-slide-over";
import {
  archiveService,
  deleteService,
  unarchiveService,
} from "@/app/actions/services";
import type { ServiceListItem } from "@/types/database";

type ServiceRow = ServiceListItem & { status?: "active" | "archived" };

export function ServicesSection({
  services,
  archiveSupported = false,
}: {
  services: ServiceRow[];
  archiveSupported?: boolean;
}) {
  const router = useRouter();
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">(
    "active"
  );

  const visible = archiveSupported
    ? statusFilter === "all"
      ? services
      : services.filter((s) => (s.status ?? "active") === statusFilter)
    : services;

  async function handleDelete(service: ServiceRow) {
    if (!confirm(`Delete service "${service.name}"?`)) return;
    const result = await deleteService(service.id);
    if ("success" in result && result.success) {
      toast.success("Service deleted");
      router.refresh();
      return;
    }
    if (!("error" in result)) {
      toast.error("Could not delete service");
      return;
    }
    if (result.code === "IN_USE") {
      const archiveHint = result.canArchive
        ? " You can archive it instead so it stays on existing tasks."
        : "";
      const archiveAnyway =
        !!result.canArchive &&
        confirm(`${result.error}${archiveHint}\n\nArchive this service instead?`);
      if (archiveAnyway) {
        const ar = await archiveService(service.id);
        if (ar.error) {
          toast.error(ar.error);
          return;
        }
        toast.success("Service archived");
        router.refresh();
        return;
      }
      toast.error(result.error);
      return;
    }
    toast.error(result.error ?? "Could not delete service");
  }

  async function handleArchive(service: ServiceRow) {
    if (!confirm(`Archive service "${service.name}"?`)) return;
    const r = await archiveService(service.id);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Service archived");
    router.refresh();
  }

  async function handleUnarchive(service: ServiceRow) {
    const r = await unarchiveService(service.id);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Service restored");
    router.refresh();
  }

  function openAdd() {
    setEditing(null);
    setSlideOpen(true);
  }

  function openEdit(service: ServiceRow) {
    setEditing(service);
    setSlideOpen(true);
  }

  return (
    <section>
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Services
        </h2>
        <div className="flex items-center gap-2">
          {archiveSupported && (
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "active" | "archived" | "all")
              }
              aria-label="Filter services by status"
              className="rounded-md border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1 text-[11px] text-[var(--text-primary)]"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          )}
          <button
            onClick={openAdd}
            className="rounded-md bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-indigo-500/15"
          >
            Add Service
          </button>
        </div>
      </div>
      <p className="mb-3.5 text-[12px] text-[var(--text-muted)]">
        Reusable names for time log autocomplete.
      </p>
      <ServiceSlideOver
        open={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          setEditing(null);
          router.refresh();
        }}
        service={editing}
      />
      {visible.length === 0 ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4 text-[12px] italic text-[var(--text-muted)]">
          {archiveSupported && statusFilter !== "all"
            ? `No ${statusFilter} services.`
            : "No services yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((s) => {
            const archived = (s.status ?? "active") === "archived";
            return (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-3.5 group"
              >
                <span className={archived ? "text-[var(--text-muted)]" : undefined}>
                  {s.name}
                  {s.default_rate != null && (
                    <span className="text-[var(--text-muted)] text-sm ml-2 font-mono">
                      {s.billing_type === "fixed"
                        ? `$${s.default_rate} flat`
                        : `$${s.default_rate}/hr`}
                    </span>
                  )}
                  {archived && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                      Archived
                    </span>
                  )}
                </span>
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(s)}
                    className="text-sm text-accent hover:underline"
                  >
                    Edit
                  </button>
                  {archiveSupported &&
                    (archived ? (
                      <button
                        onClick={() => handleUnarchive(s)}
                        className="text-sm text-accent hover:underline"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchive(s)}
                        className="text-sm text-[var(--text-muted)] hover:underline"
                      >
                        Archive
                      </button>
                    ))}
                  <button
                    onClick={() => handleDelete(s)}
                    className="text-sm text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
