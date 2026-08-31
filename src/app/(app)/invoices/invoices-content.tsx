"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CreateInvoiceSlideOver } from "@/components/create-invoice-slide-over";
import { resolveInvoiceDisplayStatus } from "@/lib/invoices/status";

type InvoiceRow = {
  id: string;
  status: string;
  total_amount: number | null;
  currency: string | null;
  created_at: string;
  issued_at: string | null;
  due_at: string | null;
  client_id: string;
  project_id: string | null;
  clients: unknown;
  projects: unknown;
};

type ClientOpt = { id: string; name: string };
type ProjectOpt = { id: string; name: string; client_id: string };

const TABS = ["All statuses", "Draft", "Sent", "Paid", "Overdue"] as const;

function getDisplayStatus(inv: InvoiceRow): string {
  return resolveInvoiceDisplayStatus({ status: inv.status, due_at: inv.due_at });
}

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
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("All statuses");
  const [clientFilter, setClientFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  const projectsForClient = useMemo(
    () => (clientFilter ? projects.filter((p) => p.client_id === clientFilter) : projects),
    [clientFilter, projects]
  );

  const filtered = useMemo(() => {
    let list = invoices;
    if (activeTab !== "All statuses") {
      if (activeTab === "Overdue") {
        list = list.filter((i) => getDisplayStatus(i) === "overdue");
      } else {
        const tab = activeTab.toLowerCase();
        list = list.filter((i) => getDisplayStatus(i) === tab);
      }
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
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <div className="flex gap-1 overflow-x-auto rounded-[10px] border border-[var(--border)] bg-white/[0.03] p-1 sm:overflow-visible">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all sm:px-4 sm:text-[12px] ${
                activeTab === t
                  ? "bg-indigo-500/15 text-[var(--accent-text)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
              {activeTab === "All statuses"
                ? "No invoices yet. Create one from unbilled time logs."
                : `No ${activeTab.toLowerCase()} invoices.`}
            </p>
            {activeTab === "All statuses" && (
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
            <div className="flex gap-2 border-b border-white/5 px-3 py-2 sm:gap-3 sm:px-5 sm:py-3">
              <span className="w-[55px] shrink-0 text-[9px] font-bold uppercase tracking-wider text-gray-500 sm:w-[70px] sm:text-[10px]">
                ID
              </span>
              <span className="min-w-0 flex-1 text-[9px] font-bold uppercase tracking-wider text-gray-500 sm:text-[10px]">
                Client
              </span>
              <span className="hidden min-w-[60px] text-[10px] font-bold uppercase tracking-wider text-gray-500 sm:inline">
                Date
              </span>
              <span className="min-w-[70px] text-right text-[9px] font-bold uppercase tracking-wider text-gray-500 sm:min-w-[80px] sm:text-[10px]">
                Amount
              </span>
              <span className="min-w-[60px] text-center text-[9px] font-bold uppercase tracking-wider text-gray-500 sm:min-w-[70px] sm:text-[10px]">
                Status
              </span>
            </div>
            {filtered.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center gap-2 border-b border-white/5 px-3 py-2 transition-colors last:border-0 hover:bg-[var(--row-hover)] sm:gap-3 sm:px-5 sm:py-3"
              >
                <span className="min-w-[55px] font-mono text-[10px] font-semibold text-accent sm:min-w-[70px] sm:text-[11px]">
                  #{inv.id.slice(0, 8)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--text-primary)] sm:text-[12px]">
                  {(inv.clients as { name?: string } | null)?.name ?? "—"}
                </span>
                <span className="hidden min-w-[60px] text-[11px] text-[var(--text-muted)] sm:inline">
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
                <span className="min-w-[70px] text-right font-mono text-[12px] font-semibold text-[var(--text-primary)] sm:min-w-[80px] sm:text-[13px]">
                  ${Number(inv.total_amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <span className="min-w-[70px] flex justify-center">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase"
                    style={(() => {
                      const s = getDisplayStatus(inv);
                      return {
                        backgroundColor: `var(--status-${s}-bg)`,
                        color: `var(--status-${s}-text)`,
                      };
                    })()}
                  >
                    {getDisplayStatus(inv)}
                  </span>
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
