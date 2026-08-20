import Link from "next/link";
import type { ProfitabilityRow, RetainerAlertRow } from "@/app/actions/org-projects";

export function OrgReportsContent({
  rows,
  alerts,
}: {
  rows: ProfitabilityRow[];
  alerts: RetainerAlertRow[];
}) {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Reports</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Project profitability and retainer usage across your organization.
      </p>

      {alerts.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase text-amber-400">
            Retainer alerts
          </h2>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.projectId}
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
              >
                <span className="font-medium text-[var(--text-primary)]">
                  {a.clientName} · {a.projectName}
                </span>
                <span className="ml-2 text-[var(--text-secondary)]">
                  {a.usedHours.toFixed(1)}h / {a.retainerHours}h ({a.pct}%)
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase text-[var(--text-muted)]">
          Profitability
        </h2>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-muted)]">
            No data yet. Approve contractor timesheets with bill/cost rates, or log time on org
            projects.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[11px] uppercase text-[var(--text-muted)]">
                  <th className="px-4 py-3">Source</th>
                  <th className="py-3 text-right">Hours</th>
                  <th className="py-3 text-right">Cost</th>
                  <th className="py-3 text-right">Revenue</th>
                  <th className="py-3 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 text-[var(--text-primary)]">{r.label}</td>
                    <td className="py-3 text-right font-mono">{r.hours}</td>
                    <td className="py-3 text-right font-mono">${r.cost.toFixed(2)}</td>
                    <td className="py-3 text-right font-mono">${r.revenue.toFixed(2)}</td>
                    <td
                      className={`py-3 text-right font-mono ${r.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      ${r.margin.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Set contractor cost rates when linking contractors. Set bill rates on approved timesheets
        in Timesheets → Approve (defaults from org link).
      </p>
    </div>
  );
}
