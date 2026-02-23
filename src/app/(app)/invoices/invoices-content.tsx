"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CreateInvoiceSlideOver } from "@/components/create-invoice-slide-over";

type InvoiceRow = {
  id: string;
  status: string;
  total_amount: number | null;
  currency: string | null;
  created_at: string;
  issued_at: string | null;
  client_id: string;
  project_id: string | null;
  clients: unknown;
  projects: unknown;
};

type ClientOpt = { id: string; name: string };
type ProjectOpt = { id: string; name: string; client_id: string };

const TABS = ["All", "Draft", "Sent", "Paid", "Overdue"] as const;

export function InvoicesContent({
  invoices,
  clients,
  projects,
}: {
  invoices: InvoiceRow[];
  clients: ClientOpt[];
  projects: ProjectOpt[];
}) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("All");
  const [clientFilter, setClientFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const projectsForClient = useMemo(
    () => (clientFilter ? projects.filter((p) => p.client_id === clientFilter) : projects),
    [clientFilter, projects]
  );

  const filtered = useMemo(() => {
    let list = invoices;
    if (activeTab !== "All") {
      list = list.filter((i) => i.status.toLowerCase() === activeTab.toLowerCase());
    }
    if (clientFilter) {
      list = list.filter((i) => i.client_id === clientFilter);
    }
    if (projectFilter) {
      list = list.filter((i) => i.project_id === projectFilter);
    }
    return list;
  }, [invoices, activeTab, clientFilter, projectFilter]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-[10px] border border-[var(--border)] bg-white/[0.03] p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`rounded-lg px-4 py-1.5 text-[12px] font-semibold transition-all ${
                activeTab === t
                  ? "bg-indigo-500/15 text-indigo-200"
                  : "text-[var(--text-muted)] hover:text-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={clientFilter}
          onChange={(e) => {
            setClientFilter(e.target.value);
            setProjectFilter("");
          }}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[12px] text-[var(--text-primary)]"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[12px] text-[var(--text-primary)] disabled:opacity-50"
          disabled={!clientFilter}
        >
          <option value="">All projects</option>
          {projectsForClient.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setInvoiceOpen(true)}
          className="rounded-lg bg-gradient-to-r from-accent to-indigo-600 px-4 py-2.5 text-[12px] font-bold text-white shadow-lg shadow-indigo-500/35 transition-all hover:-translate-y-px hover:shadow-indigo-500/50"
        >
          + New Invoice
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        {filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="mb-4 text-[var(--text-muted)]">
              {activeTab === "All"
                ? "No invoices yet. Create one from unbilled time logs."
                : `No ${activeTab.toLowerCase()} invoices.`}
            </p>
            {activeTab === "All" && (
              <button
                onClick={() => setInvoiceOpen(true)}
                className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Create Invoice
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-3 border-b border-white/5 px-5 py-3">
              <span className="w-[70px] shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                ID
              </span>
              <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Client
              </span>
              <span className="min-w-[60px] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Date
              </span>
              <span className="min-w-[80px] text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Amount
              </span>
              <span className="min-w-[70px] text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Status
              </span>
            </div>
            {filtered.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center gap-3 border-b border-white/5 px-5 py-3 transition-colors last:border-0 hover:bg-white/5"
              >
                <span className="min-w-[70px] font-mono text-[11px] font-semibold text-accent">
                  #{inv.id.slice(0, 8)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-gray-200">
                  {(inv.clients as { name?: string } | null)?.name ?? "—"}
                </span>
                <span className="min-w-[60px] text-[11px] text-[var(--text-muted)]">
                  {inv.issued_at
                    ? new Date(inv.issued_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : new Date(inv.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                </span>
                <span className="min-w-[80px] text-right font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                  ${Number(inv.total_amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <span
                  className={`min-w-[70px] text-center rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                    inv.status === "paid"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : inv.status === "sent"
                        ? "bg-indigo-500/10 text-indigo-300"
                        : inv.status === "overdue"
                          ? "bg-amber-500/10 text-amber-300"
                          : inv.status === "draft"
                            ? "bg-gray-500/10 text-gray-400"
                            : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {inv.status}
                </span>
              </Link>
            ))}
          </>
        )}
      </div>

      <CreateInvoiceSlideOver
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
      />
    </>
  );
}
