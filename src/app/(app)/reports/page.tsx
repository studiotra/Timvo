import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRevenueByPeriod, getRevenueByClient, getIncomeStability, getUnderpricedProjects } from "@/app/actions/reports";
import { getClientEffectiveRates } from "@/app/actions/effective-rates";
import { getProjectedAnnual } from "@/app/actions/income-summary";
import {
  RevenueByClientChart,
  RevenueByPeriodChart,
  ClientRevenuePieChart,
  GoalsVsRealizedChart,
  IncomeStabilityChart,
} from "./reports-charts";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [byPeriod, byClient, clientRates, projectedData, incomeStability, underpricedProjects] = await Promise.all([
    getRevenueByPeriod(),
    getRevenueByClient(),
    getClientEffectiveRates(),
    getProjectedAnnual(),
    getIncomeStability(),
    getUnderpricedProjects(),
  ]);

  const totalYTD = byPeriod.find((p) => p.period.endsWith(" YTD"))?.amount ?? 0;
  const totalRevenue = clientRates.reduce((s, c) => s + c.revenue, 0);
  const sortedByProfitability = [...clientRates]
    .filter((c) => c.effectiveRate != null && c.totalHours > 0)
    .sort((a, b) => (b.effectiveRate ?? 0) - (a.effectiveRate ?? 0));

  return (
    <>
      {/* Summary cards */}
      <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            YTD Revenue
          </div>
          <div className="font-mono text-[26px] font-semibold tracking-tight text-[var(--text-primary)]">
            ${totalYTD.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </div>
          <div className="mt-1.5 text-[11px] font-medium text-emerald-400">
            Paid invoices
          </div>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            This Month
          </div>
          <div className="font-mono text-[26px] font-semibold tracking-tight text-[var(--text-primary)]">
            ${(byPeriod[0]?.amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </div>
          <div className="mt-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            Current month
          </div>
        </div>
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Top Client
          </div>
          <div className="font-mono text-[26px] font-semibold tracking-tight text-[var(--text-primary)]">
            {byClient[0]?.clientName ?? "—"}
          </div>
          <div className="mt-1.5 text-[11px] font-medium text-[var(--text-muted)]">
            {byClient[0] ? `$${byClient[0].amount.toLocaleString()}` : "—"}
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="mb-7 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h2 className="mb-1 font-semibold text-[var(--text-primary)]">Revenue by client</h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">Top clients by paid revenue</p>
          {byClient.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--text-muted)]">No paid invoices yet</p>
          ) : (
            <RevenueByClientChart data={byClient} />
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h2 className="mb-1 font-semibold text-[var(--text-primary)]">Revenue by period</h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">This month, last month, YTD</p>
          {byPeriod.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--text-muted)]">No paid invoices yet</p>
          ) : (
            <RevenueByPeriodChart data={byPeriod} />
          )}
        </div>
      </div>

      <div className="mb-7 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h2 className="mb-1 font-semibold text-[var(--text-primary)]">Client revenue share</h2>
          <p className="mb-2 text-xs text-[var(--text-muted)]">Distribution across top 6 clients</p>
          {byClient.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--text-muted)]">No paid invoices yet</p>
          ) : (
            <ClientRevenuePieChart data={byClient} />
          )}
        </div>
        {projectedData.annualGoal != null && projectedData.annualGoal > 0 && (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h2 className="mb-1 font-semibold text-[var(--text-primary)]">Goals vs realized</h2>
            <p className="mb-4 text-xs text-[var(--text-muted)]">Projected annual vs your goal</p>
            <GoalsVsRealizedChart projected={projectedData.projected} goal={projectedData.annualGoal} />
          </div>
        )}
      </div>

      <div className="mb-7 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <h2 className="mb-1 font-semibold text-[var(--text-primary)]">Income stability</h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">Monthly revenue over the last 12 months</p>
          <IncomeStabilityChart data={incomeStability} />
        </div>
        {underpricedProjects.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <h2 className="mb-1 font-semibold text-amber-400">Underpriced project alerts</h2>
            <p className="mb-4 text-xs text-[var(--text-muted)]">Projects earning below 70% of target rate</p>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {underpricedProjects.map((p) => (
                <Link
                  key={p.projectId}
                  href={`/clients/${p.clientId}`}
                  className="block rounded-lg border border-amber-500/20 bg-[var(--bg-app)]/50 px-4 py-3 hover:bg-amber-500/10 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">{p.projectName}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-2">· {p.clientName}</span>
                    </div>
                    <span className="font-mono text-sm text-amber-400 flex-shrink-0">
                      ${p.effectiveRate.toFixed(0)}/hr vs ${p.targetRate.toFixed(0)} target
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {p.totalHours.toFixed(1)}h · ${p.revenue.toLocaleString()} revenue
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detailed tables */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold">Client profitability</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Total time spent (incl. non-billable) · Revenue · Effective rate (revenue ÷ total hours)
            </p>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-80 overflow-y-auto">
            {sortedByProfitability.length === 0 ? (
              <p className="p-6 text-sm text-[var(--text-muted)] text-center">
                No clients with logged hours and paid invoices yet
              </p>
            ) : (
              sortedByProfitability.map(({ clientId, clientName, revenue, totalHours, billableHours, effectiveRate }) => {
                const pct = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                const rateColor =
                  effectiveRate != null && effectiveRate >= 100
                    ? "text-emerald-400"
                    : effectiveRate != null && effectiveRate >= 50
                      ? "text-amber-400"
                      : "text-red-400";
                const hoursLabel = Math.abs(totalHours - billableHours) < 0.01
                  ? `${totalHours.toFixed(1)}h`
                  : `${totalHours.toFixed(1)}h total (${billableHours.toFixed(1)}h billable)`;
                return (
                  <Link
                    key={clientId}
                    href={`/clients/${clientId}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--bg-app)] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate block">
                        {clientName}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {hoursLabel} · ${revenue.toLocaleString()} · {pct.toFixed(0)}% of total
                      </span>
                    </div>
                    <span className={`font-mono text-sm font-bold flex-shrink-0 ${rateColor}`}>
                      ${effectiveRate!.toFixed(0)}/hr
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold">Revenue by client</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Paid invoices only
            </p>
          </div>
          <div className="divide-y divide-[var(--border)] max-h-64 overflow-y-auto">
            {byClient.length === 0 ? (
              <p className="p-6 text-sm text-[var(--text-muted)] text-center">
                No paid invoices yet
              </p>
            ) : (
              byClient
                .sort((a, b) => b.amount - a.amount)
                .map(({ clientId, clientName, amount }) => (
                  <Link
                    key={clientId}
                    href={`/clients/${clientId}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-app)] transition-colors"
                  >
                    <span className="text-sm text-[var(--text-primary)] truncate">
                      {clientName}
                    </span>
                    <span className="font-mono font-semibold flex-shrink-0 ml-2">
                      ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </Link>
                ))
            )}
          </div>
        </div>
      </div>

    </>
  );
}
