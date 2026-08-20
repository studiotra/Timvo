import Link from "next/link";
import { getOrgDashboardStats } from "@/app/actions/organizations";
import { getOrgRetainerAlerts } from "@/app/actions/org-projects";

export default async function OrgDashboardPage() {
  const [stats, alerts] = await Promise.all([
    getOrgDashboardStats(),
    getOrgRetainerAlerts(),
  ]);

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-violet-500/10 to-indigo-600/5 px-8 py-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {stats.orgName || "Organization"}
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Manage clients, review contractor timesheets, and track project delivery.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Clients", value: stats.clients },
          { label: "Projects", value: stats.projects },
          { label: "Contractors", value: stats.contractors },
          { label: "Pending review", value: stats.pendingTimesheets },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/org/clients"
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-colors hover:border-accent/40"
        >
          <h2 className="font-semibold text-[var(--text-primary)]">Manage clients</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            End clients, projects, viewer invites
          </p>
        </Link>
        <Link
          href="/org/timesheets"
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-colors hover:border-accent/40"
        >
          <h2 className="font-semibold text-[var(--text-primary)]">Review timesheets</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {stats.pendingTimesheets > 0
              ? `${stats.pendingTimesheets} submission(s) waiting for approval`
              : "No pending contractor submissions"}
          </p>
        </Link>
        <Link
          href="/org/reports"
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-colors hover:border-accent/40"
        >
          <h2 className="font-semibold text-[var(--text-primary)]">Reports & retainers</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {alerts.length > 0
              ? `${alerts.length} project(s) nearing retainer limit`
              : "Profitability and budget tracking"}
          </p>
        </Link>
      </div>

      {alerts.length > 0 && (
        <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h2 className="text-sm font-semibold text-amber-400 mb-2">Retainer alerts</h2>
          <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
            {alerts.slice(0, 5).map((a) => (
              <li key={a.projectId}>
                {a.clientName} · {a.projectName}: {a.pct}% used ({a.usedHours.toFixed(1)}h / {a.retainerHours}h)
              </li>
            ))}
          </ul>
          <Link href="/org/reports" className="mt-2 inline-block text-xs text-accent hover:underline">
            View all reports →
          </Link>
        </div>
      )}
    </div>
  );
}
