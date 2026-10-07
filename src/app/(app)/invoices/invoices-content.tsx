"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CreateInvoiceSlideOver } from "@/components/create-invoice-slide-over";
import { resolveInvoiceDisplayStatus } from "@/lib/invoices/status";
import { useTimezone } from "@/contexts/timezone-context";
import { formatDateOnly } from "@/lib/dates";
import { invoiceNumberLabel } from "@/lib/invoices/number";

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
  invoice_number?: number | null;
  clients: unknown;
  projects: unknown;
};

type ClientOpt = { id: string; name: string };
type ProjectOpt = { id: string; name: string; client_id: string };

const TABS = ["All statuses", "Draft", "Sent", "Paid", "Overdue"] as const;

type SortKey = "number" | "client" | "issued" | "due" | "amount" | "status";
type SortDir = "asc" | "desc";

export function InvoicesContent({
  invoices,
  clients,
  projects,
  invoicePrefix = "INV-",
}: {
  invoices: InvoiceRow[];
  clients: ClientOpt[];
  projects: ProjectOpt[];
  invoicePrefix?: string;
}) {
  const timezone = useTimezone();
  const getDisplayStatus = (inv: InvoiceRow): string =>
    resolveInvoiceDisplayStatus(
      { status: inv.status, due_at: inv.due_at, total_amount: inv.total_amount },
      timezone
    );
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("All statuses");
  const [clientFilter, setClientFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("issued");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const inv of invoices) {
      const d = inv.issued_at || inv.created_at?.slice(0, 10);
      if (d && /^\d{4}/.test(d)) set.add(d.slice(0, 4));
    }
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  const projectsForClient = useMemo(
    () => (clientFilter ? projects.filter((p) => p.client_id === clientFilter) : []),
    [clientFilter, projects]
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "issued" || key === "due" || key === "amount" ? "desc" : "asc");
    }
  }

  const filtered = useMemo(() => {
    const statusOf = (inv: InvoiceRow) =>
      resolveInvoiceDisplayStatus(
        { status: inv.status, due_at: inv.due_at, total_amount: inv.total_amount },
        timezone
      );
    let list = invoices;
    if (activeTab !== "All statuses") {
      if (activeTab === "Overdue") {
        list = list.filter((i) => statusOf(i) === "overdue");
      } else {
        const tab = activeTab.toLowerCase();
        list = list.filter((i) => statusOf(i) === tab);
      }
    }
    if (clientFilter) {
      list = list.filter((i) => i.client_id === clientFilter);
    }
    if (projectFilter) {
      list = list.filter((i) => i.project_id === projectFilter);
    }
    if (yearFilter) {
      list = list.filter((i) => {
        const d = i.issued_at || i.created_at?.slice(0, 10) || "";
        return d.startsWith(yearFilter);
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => {
        const clientName = ((i.clients as { name?: string } | null)?.name ?? "").toLowerCase();
        const projectName = ((i.projects as { name?: string } | null)?.name ?? "").toLowerCase();
        const num = invoiceNumberLabel(invoicePrefix, i.invoice_number).toLowerCase();
        return (
          clientName.includes(q) ||
          projectName.includes(q) ||
          num.includes(q) ||
          i.id.toLowerCase().includes(q)
        );
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const clientA = (a.clients as { name?: string } | null)?.name ?? "";
      const clientB = (b.clients as { name?: string } | null)?.name ?? "";
      switch (sortKey) {
        case "number": {
          const na = a.invoice_number ?? 0;
          const nb = b.invoice_number ?? 0;
          return (na - nb) * dir;
        }
        case "client":
          return clientA.localeCompare(clientB) * dir;
        case "issued": {
          const da = a.issued_at || a.created_at.slice(0, 10);
          const db = b.issued_at || b.created_at.slice(0, 10);
          return da.localeCompare(db) * dir;
        }
        case "due": {
          const da = a.due_at || "";
          const db = b.due_at || "";
          return da.localeCompare(db) * dir;
        }
        case "amount":
          return (Number(a.total_amount ?? 0) - Number(b.total_amount ?? 0)) * dir;
        case "status":
          return statusOf(a).localeCompare(statusOf(b)) * dir;
        default:
          return 0;
      }
    });
  }, [
    invoices,
    activeTab,
    clientFilter,
    projectFilter,
    yearFilter,
    search,
    sortKey,
    sortDir,
    timezone,
    invoicePrefix,
  ]);

  function SortHeader({
    label,
    sort,
    className = "",
  }: {
    label: string;
    sort: SortKey;
    className?: string;
  }) {
    const active = sortKey === sort;
    return (
      <button
        type="button"
        onClick={() => toggleSort(sort)}
        className={`text-left text-[9px] font-bold uppercase tracking-wider text-gray-500 hover:text-[var(--text-primary)] sm:text-[10px] ${className}`}
      >
        {label}
        {active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    );
  }

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
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, project, number…"
          aria-label="Search invoices"
          className="min-w-[160px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[12px] text-[var(--text-primary)] sm:max-w-[220px]"
        />
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          aria-label="Filter by year"
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[12px] text-[var(--text-primary)]"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
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
          title={!clientFilter ? "Select a client first" : undefined}
        >
          <option value="">{clientFilter ? "All projects" : "Select client first"}</option>
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
              {activeTab === "All statuses" && !search && !yearFilter
                ? "No invoices yet. Create one from unbilled time logs."
                : "No invoices match these filters."}
            </p>
            {activeTab === "All statuses" && !search && !yearFilter && (
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
              <SortHeader label="No." sort="number" className="w-[70px] shrink-0 sm:w-[90px]" />
              <SortHeader label="Client" sort="client" className="min-w-0 flex-1" />
              <SortHeader
                label="Issued"
                sort="issued"
                className="hidden min-w-[70px] sm:inline"
              />
              <SortHeader
                label="Due"
                sort="due"
                className="hidden min-w-[70px] md:inline"
              />
              <SortHeader
                label="Amount"
                sort="amount"
                className="min-w-[70px] text-right sm:min-w-[80px]"
              />
              <SortHeader
                label="Status"
                sort="status"
                className="min-w-[60px] text-center sm:min-w-[70px]"
              />
            </div>
            {filtered.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center gap-2 border-b border-white/5 px-3 py-2 transition-colors last:border-0 hover:bg-[var(--row-hover)] sm:gap-3 sm:px-5 sm:py-3"
              >
                <span className="min-w-[70px] font-mono text-[10px] font-semibold text-accent sm:min-w-[90px] sm:text-[11px]">
                  {invoiceNumberLabel(invoicePrefix, inv.invoice_number)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--text-primary)] sm:text-[12px]">
                  {(inv.clients as { name?: string } | null)?.name ?? "—"}
                </span>
                <span className="hidden min-w-[70px] text-[11px] text-[var(--text-muted)] sm:inline">
                  {inv.issued_at
                    ? formatDateOnly(inv.issued_at)
                    : formatDateOnly(inv.created_at.slice(0, 10))}
                </span>
                <span className="hidden min-w-[70px] text-[11px] text-[var(--text-muted)] md:inline">
                  {inv.due_at ? formatDateOnly(inv.due_at) : "—"}
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
