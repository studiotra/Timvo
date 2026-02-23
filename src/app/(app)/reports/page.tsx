import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getRevenueByPeriod, getRevenueByClient } from "@/app/actions/reports";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [byPeriod, byClient] = await Promise.all([
    getRevenueByPeriod(),
    getRevenueByClient(),
  ]);

  const totalYTD = byPeriod.find((p) => p.period.endsWith(" YTD"))?.amount ?? 0;

  return (
    <>
      <div className="mb-7 grid grid-cols-3 gap-4">
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

      <div className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-semibold">Revenue by period</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Paid invoices only
            </p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {byPeriod.length === 0 ? (
              <p className="p-6 text-sm text-[var(--text-muted)] text-center">
                No paid invoices yet
              </p>
            ) : (
              byPeriod.map(({ period, amount }) => (
                <div
                  key={period}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm text-[var(--text-primary)]">
                    {period}
                  </span>
                  <span className="font-mono font-semibold">
                    ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
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
