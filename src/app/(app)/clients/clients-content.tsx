"use client";

import { useState } from "react";
import Link from "next/link";
import { ClientSlideOver } from "@/components/client-slide-over";
import { deleteClient } from "@/app/actions/clients";
import type { ClientListItem } from "@/types/database";

const AVATAR_COLORS = [
  "linear-gradient(135deg,#6366F1,#818CF8)",
  "linear-gradient(135deg,#10B981,#34D399)",
  "linear-gradient(135deg,#F59E0B,#FBBF24)",
  "linear-gradient(135deg,#EC4899,#F472B6)",
];

const PROJECT_COLORS: Record<string, string> = {
  default: "#6b7280",
};

type ProjectRow = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  hourly_rate: number | null;
  billing_type: string;
  status: string;
};

export function ClientsContent({
  clients,
  projects,
  onRefresh,
}: {
  clients: ClientListItem[];
  projects: ProjectRow[];
  onRefresh?: () => void;
}) {
  const [slideOpen, setSlideOpen] = useState(false);
  const [editing, setEditing] = useState<ClientListItem | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this client and all their projects?")) return;
    await deleteClient(id);
  }

  function openAdd() {
    setEditing(null);
    setSlideOpen(true);
  }

  function openEdit(client: ClientListItem) {
    setEditing(client);
    setSlideOpen(true);
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div className="text-[13px] text-[var(--text-secondary)]">
          {clients.length} active client{clients.length !== 1 ? "s" : ""}
        </div>
        <button
          onClick={openAdd}
          className="rounded-lg bg-gradient-to-r from-accent to-indigo-600 px-4 py-2.5 text-[12px] font-bold text-white shadow-lg shadow-indigo-500/35 transition-all hover:-translate-y-px hover:shadow-indigo-500/50"
        >
          + Add Client
        </button>
      </div>

      <ClientSlideOver
        open={slideOpen}
        onClose={() => {
          setSlideOpen(false);
          setEditing(null);
        }}
        onSuccess={onRefresh}
        client={editing}
      />

      <div className="mb-5 grid grid-cols-3 gap-4">
        {clients.map((client, i) => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className="group rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-all hover:-translate-y-px hover:border-indigo-500/30 hover:shadow-lg hover:shadow-black/20"
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-[15px] font-extrabold text-white"
              style={{
                background:
                  AVATAR_COLORS[i % AVATAR_COLORS.length],
              }}
            >
              {client.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="mb-1 text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
              {client.name}
            </div>
            <div className="mb-3 text-[11px] font-medium text-[var(--text-muted)]">
              {client.email || "—"}
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--text-secondary)]">
                {client.currency ?? "USD"}
              </span>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                ACTIVE
              </span>
            </div>
            <div className="mt-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  openEdit(client);
                }}
                className="text-[11px] font-semibold text-accent hover:underline"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(client.id);
                }}
                className="text-[11px] font-semibold text-red-400 hover:underline"
              >
                Delete
              </button>
            </div>
          </Link>
        ))}
        <button
          onClick={openAdd}
          className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-white/10 transition-all hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:text-indigo-300"
        >
          <span className="text-2xl">+</span>
          <span className="text-[12px] font-semibold">New Client</span>
        </button>
      </div>

      <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Projects
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        {projects.length === 0 ? (
          <div className="px-5 py-8 text-center text-[12px] text-[var(--text-muted)]">
            No projects. Add a client first, then add projects.
          </div>
        ) : (
          projects.map((p, i) => (
            <Link
              key={p.id}
              href={`/clients/${p.clientId}`}
              className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/5 ${
                i < projects.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <div
                className="h-2 w-2 flex-shrink-0 rounded-sm"
                style={{
                  background: PROJECT_COLORS[p.clientName] || PROJECT_COLORS.default,
                }}
              />
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-gray-200">
                  {p.name}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {p.clientName}
                </div>
              </div>
              <span className="font-mono text-[12px] font-medium text-[var(--text-secondary)]">
                {p.billing_type === "fixed" && p.hourly_rate
                  ? `$${Number(p.hourly_rate).toFixed(0)}`
                  : p.hourly_rate
                    ? `$${Number(p.hourly_rate)}/hr`
                    : "—"}
              </span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--text-muted)]">
                {p.billing_type}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[9px] font-bold ${
                  p.status === "active"
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-gray-500/10 text-gray-400"
                }`}
              >
                {p.status.toUpperCase()}
              </span>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
