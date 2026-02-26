"use client";

import { useState } from "react";
import { ServiceSlideOver } from "@/components/service-slide-over";
import { deleteService } from "@/app/actions/services";
import type { ServiceListItem } from "@/types/database";

export function ServicesSection({ services }: { services: ServiceListItem[] }) {
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceListItem | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this service?")) return;
    await deleteService(id);
  }

  function openAdd() {
    setEditing(null);
    setSlideOpen(true);
  }

  function openEdit(service: ServiceListItem) {
    setEditing(service);
    setSlideOpen(true);
  }

  return (
    <section>
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Services
        </h2>
        <button
          onClick={openAdd}
          className="rounded-md bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-indigo-500/15"
        >
          Add Service
        </button>
      </div>
      <p className="mb-3.5 text-[12px] text-[var(--text-muted)]">
        Reusable names for time log autocomplete.
      </p>
      <ServiceSlideOver
        open={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          setEditing(null);
        }}
        service={editing}
      />
      {services.length === 0 ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4 text-[12px] italic text-[var(--text-muted)]">
          No services yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {services.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-3.5 group"
            >
              <span>
                {s.name}
                {s.default_rate != null && (
                  <span className="text-[var(--text-muted)] text-sm ml-2 font-mono">
                    {s.billing_type === "fixed" ? `$${s.default_rate} flat` : `$${s.default_rate}/hr`}
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
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-sm text-red-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
