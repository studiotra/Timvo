"use client";

import { useState } from "react";
import Link from "next/link";
import { CreateInvoiceSlideOver } from "@/components/create-invoice-slide-over";
import { ManualLogSlideOver } from "@/components/manual-log-slide-over";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PROJECT_COLORS: Record<string, string> = {
  default: "#6b7280",
};

type DashboardContentProps = {
  unbilledTotal: number;
  weekMinutes: number;
  receivedTotal: number;
  heatmapData?: number[];
  recentLogs?: Array<{
    id: string;
    description: string | null;
    duration_minutes: number;
    amount: number;
    projectName: string;
    projectColor?: string;
    isBilled: boolean;
  }>;
  recentInvoices?: Array<{
    id: string;
    clientName: string;
    total_amount: number;
    status: string;
    date: string;
  }>;
};

function MetricCard({
  label,
  value,
  sub,
  subClass = "",
  icon,
  iconBg,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  subClass?: string;
  icon: string;
  iconBg: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[14px] border bg-[var(--bg-card)] p-5 backdrop-blur-sm transition-all hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-xl hover:shadow-black/30 ${
        highlight
          ? "border-indigo-500/25 bg-indigo-500/10 hover:border-indigo-500/40"
          : "border-[var(--border)]"
      }`}
    >
      <div className="mb-3.5 flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[13px]"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
      </div>
      <div className="font-mono text-[26px] font-semibold leading-none tracking-tight text-[var(--text-primary)]">
        {value}
      </div>
      <div className={`mt-1.5 text-[11px] font-medium text-[var(--text-muted)] ${subClass}`}>
        {sub}
      </div>
    </div>
  );
}

export function DashboardContent({
  unbilledTotal,
  weekMinutes,
  receivedTotal,
  heatmapData = [0.45, 0.7, 0.85, 0.6, 0.9, 0.3, 0.1],
  recentLogs = [],
  recentInvoices = [],
}: DashboardContentProps) {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [manualLogOpen, setManualLogOpen] = useState(false);

  const weekHours = (weekMinutes / 60).toFixed(1);
  const maxHeat = Math.max(...heatmapData, 0.01);

  return (
    <>
      <div className="mb-7 grid grid-cols-4 gap-4">
        <MetricCard
          label="This Month"
          value={`$${receivedTotal.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          sub="Paid invoices"
          icon="💰"
          iconBg="rgba(16,185,129,0.1)"
        />
        <MetricCard
          label="Unbilled"
          value={`$${unbilledTotal.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          sub={`${recentLogs.filter((l) => !l.isBilled).length} logs ready`}
          icon="⏳"
          iconBg="rgba(245,158,11,0.1)"
          highlight
        />
        <MetricCard
          label="Hours This Week"
          value={`${weekHours}h`}
          sub="Total tracked"
          icon="⏱"
          iconBg="rgba(99,102,241,0.1)"
        />
        <MetricCard
          label="Recent Invoices"
          value={String(recentInvoices.length)}
          sub="Last 7 days"
          icon="📄"
          iconBg="rgba(99,102,241,0.1)"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        {/* Left: Heatmap + Unbilled + Recent Logs */}
        <div className="flex flex-col gap-5">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <div className="text-[13px] font-bold text-gray-200">
                  Weekly Activity
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  This week
                </div>
              </div>
              <button
                onClick={() => setManualLogOpen(true)}
                className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-indigo-500/15"
              >
                + Manual Log
              </button>
            </div>
            <div className="p-5">
              <div className="mb-2 flex h-[120px] items-end gap-3">
                {heatmapData.map((val, i) => (
                  <div
                    key={i}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <span className="font-mono text-[10px] font-medium text-[var(--text-muted)]">
                      {((val || 0) * 8).toFixed(1)}h
                    </span>
                    <div
                      className="relative w-full rounded-t-md bg-gradient-to-t from-indigo-500/60 to-indigo-500/30"
                      style={{
                        height: `${Math.max(((val || 0) / maxHeat) * 100, 8)}px`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mb-2.5 h-px bg-white/10" />
              <div className="flex justify-between">
                {DAYS.map((d) => (
                  <span
                    key={d}
                    className="flex-1 text-center text-[10px] font-semibold text-[var(--text-muted)]"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Unbilled / Received Banner */}
            <div className="mx-5 mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/12 to-indigo-500/5 px-4 py-3.5">
              <div className="flex items-center gap-6">
                <div>
                  <div className="font-mono text-[22px] font-semibold tracking-tight text-indigo-200">
                    ${unbilledTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                    Unbilled
                  </div>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div>
                  <div className="font-mono text-[18px] font-semibold tracking-tight text-emerald-400">
                    ${receivedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                    Received this month
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInvoiceOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-indigo-600 px-4 py-2.5 text-[12px] font-bold text-white shadow-lg shadow-indigo-500/35 transition-all hover:-translate-y-px hover:shadow-indigo-500/50"
              >
                ⚡ Generate Invoice
              </button>
            </div>
          </div>

          {/* Recent Logs */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div className="text-[13px] font-bold text-gray-200">
                Recent Logs
              </div>
              <Link
                href="/clients"
                className="text-[11px] font-semibold text-accent"
              >
                View All
              </Link>
            </div>
            <div className="divide-y divide-white/5 px-5">
              {recentLogs.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-[var(--text-muted)]">
                  No recent logs
                </div>
              ) : (
                recentLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 border-b border-white/5 py-2.5 last:border-0"
                  >
                    <div
                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{
                        background:
                          log.projectColor ||
                          PROJECT_COLORS[log.projectName] ||
                          PROJECT_COLORS.default,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-gray-200">
                        {log.description || "Time"}
                      </div>
                      <div className="text-[10px] font-semibold text-[var(--text-muted)]">
                        {log.projectName}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-medium text-[var(--text-secondary)]">
                      {(log.duration_minutes / 60).toFixed(1)}h
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        log.isBilled
                          ? "bg-gray-500/10 text-[var(--text-muted)]"
                          : "bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {log.isBilled ? "BILLED" : "UNBILLED"}
                    </span>
                    <span className="font-mono text-[12px] font-semibold text-[var(--text-primary)]">
                      ${log.amount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Recent Invoices + Quick Stats */}
        <div className="flex flex-col gap-0">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div className="text-[13px] font-bold text-gray-200">
                Recent Invoices
              </div>
              <Link
                href="/invoices"
                className="text-[11px] font-semibold text-accent"
              >
                + New
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {recentInvoices.length === 0 ? (
                <div className="px-5 py-8 text-center text-[12px] text-[var(--text-muted)]">
                  No invoices yet
                </div>
              ) : (
                recentInvoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/5"
                  >
                    <div>
                      <div className="font-mono text-[11px] font-semibold text-accent">
                        #{inv.id.slice(0, 8)}
                      </div>
                      <div className="text-[12px] font-medium text-gray-200">
                        {inv.clientName}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {inv.date}
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                        ${Number(inv.total_amount).toFixed(2)}
                      </div>
                      <div className="mt-1">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                            inv.status === "paid"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : inv.status === "sent"
                                ? "bg-indigo-500/10 text-indigo-300"
                                : inv.status === "draft"
                                  ? "bg-gray-500/10 text-gray-400"
                                  : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateInvoiceSlideOver
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
      />
      <ManualLogSlideOver
        open={manualLogOpen}
        onClose={() => setManualLogOpen(false)}
      />
    </>
  );
}
