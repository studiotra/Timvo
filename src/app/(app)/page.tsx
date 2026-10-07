import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getBusinessEffectiveRate,
  getClientEffectiveRates,
} from "@/app/actions/effective-rates";
import { getIncomeSummary, getProjectedAnnual } from "@/app/actions/income-summary";
import {
  formatDateOnly,
  formatLogDisplayTitle,
  getMonthRange,
  getWeekRange,
  localMondayBasedDayIndex,
} from "@/lib/dates";
import { hourlyLogAmount, resolveHourlyRate } from "@/lib/rates";
import { fetchUserTimezone } from "@/lib/user-timezone";
import { DashboardContent } from "./dashboard-content";

const PROJECT_COLORS: Record<string, string> = {
  default: "#6b7280",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const timezone = await fetchUserTimezone(supabase, user.id);

  // Unbilled total — project rate → service rate (via task)
  const { data: unbilledLogs } = await supabase
    .from("time_logs")
    .select(
      "id, duration_minutes, task_id, projects(hourly_rate), tasks(service_id)"
    )
    .eq("user_id", user.id)
    .eq("is_billable", true)
    .eq("is_billed", false);

  const serviceIds = [
    ...new Set(
      (unbilledLogs ?? [])
        .map((l) => {
          const task = l.tasks as { service_id?: string | null } | null;
          return task?.service_id ?? null;
        })
        .filter(Boolean)
    ),
  ] as string[];

  const servicesRateMap: Record<string, number | null> = {};
  if (serviceIds.length > 0) {
    const { data: services } = await supabase
      .from("services")
      .select("id, default_rate")
      .in("id", serviceIds);
    for (const s of services ?? []) {
      servicesRateMap[s.id] =
        s.default_rate != null ? Number(s.default_rate) : null;
    }
  }

  let unbilledTotal = 0;
  let unbilledLogCount = 0;
  let unbilledMissingRateCount = 0;
  if (unbilledLogs) {
    for (const log of unbilledLogs) {
      unbilledLogCount += 1;
      const proj = log.projects as { hourly_rate?: number | null } | null;
      const task = log.tasks as { service_id?: string | null } | null;
      const serviceId = task?.service_id ?? null;
      const resolved = resolveHourlyRate({
        projectRate: proj?.hourly_rate,
        serviceRate: serviceId ? servicesRateMap[serviceId] : null,
      });
      if (resolved.missing) unbilledMissingRateCount += 1;
      unbilledTotal += hourlyLogAmount(log.duration_minutes ?? 0, resolved);
    }
  }

  // Week stats (Mon–Sun in user's timezone — matches Logs)
  const weekRange = getWeekRange(timezone);
  const { data: weekLogs } = await supabase
    .from("time_logs")
    .select("started_at, duration_minutes")
    .eq("user_id", user.id)
    .gte("started_at", weekRange.from.toISOString())
    .lte("started_at", weekRange.to.toISOString());

  const weekMinutes =
    weekLogs?.reduce((s, l) => s + (l.duration_minutes ?? 0), 0) ?? 0;

  const dayMinutes = [0, 0, 0, 0, 0, 0, 0];
  if (weekLogs) {
    for (const log of weekLogs) {
      const dayIdx = localMondayBasedDayIndex(log.started_at, timezone);
      dayMinutes[dayIdx] += log.duration_minutes ?? 0;
    }
  }
  const maxDay = Math.max(...dayMinutes, 1);
  const heatmapData = dayMinutes.map((m) => m / maxDay);

  // Received this month (local calendar month)
  const monthRange = getMonthRange(timezone);
  const { data: paidInvoices } = await supabase
    .from("invoices")
    .select("total_amount")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .gte("created_at", monthRange.from.toISOString())
    .lte("created_at", monthRange.to.toISOString());

  const receivedTotal =
    paidInvoices?.reduce((s, i) => s + (Number(i.total_amount) ?? 0), 0) ?? 0;

  // Recent logs
  const { data: recentLogsRaw } = await supabase
    .from("time_logs")
    .select(
      "id, description, duration_minutes, is_billed, projects(name, hourly_rate), tasks(name, service_id)"
    )
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(10);

  const recentServiceIds = [
    ...new Set(
      (recentLogsRaw ?? [])
        .map((l) => {
          const task = l.tasks as { service_id?: string | null } | null;
          return task?.service_id ?? null;
        })
        .filter(Boolean)
    ),
  ] as string[];
  const recentServicesMap: Record<string, number | null> = { ...servicesRateMap };
  const missingRecent = recentServiceIds.filter((id) => !(id in recentServicesMap));
  if (missingRecent.length > 0) {
    const { data: services } = await supabase
      .from("services")
      .select("id, default_rate")
      .in("id", missingRecent);
    for (const s of services ?? []) {
      recentServicesMap[s.id] =
        s.default_rate != null ? Number(s.default_rate) : null;
    }
  }

  const recentLogs =
    recentLogsRaw?.map((l) => {
      const proj = l.projects as {
        name?: string;
        hourly_rate?: number | null;
      } | null;
      const task = l.tasks as {
        name?: string;
        service_id?: string | null;
      } | null;
      const serviceId = task?.service_id ?? null;
      const resolved = resolveHourlyRate({
        projectRate: proj?.hourly_rate,
        serviceRate: serviceId ? recentServicesMap[serviceId] : null,
      });
      const amount = hourlyLogAmount(l.duration_minutes ?? 0, resolved);
      const projectName = proj?.name ?? "Unknown";
      const colorKeys = Object.keys(PROJECT_COLORS).filter((k) => k !== "default");
      return {
        id: l.id,
        description: l.description,
        title: formatLogDisplayTitle({
          description: l.description,
          taskName: task?.name,
          projectName,
        }),
        duration_minutes: l.duration_minutes ?? 0,
        amount,
        missingRate: resolved.missing && (l.is_billed === false),
        projectName,
        projectColor: colorKeys.includes(projectName)
          ? PROJECT_COLORS[projectName]
          : undefined,
        isBilled: l.is_billed ?? false,
      };
    }) ?? [];

  // Recent invoices
  const { data: recentInvoicesRaw } = await supabase
    .from("invoices")
    .select("id, total_amount, status, issued_at, clients(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentInvoices =
    recentInvoicesRaw?.map((inv) => ({
      id: inv.id,
      clientName: (inv.clients as { name?: string } | null)?.name ?? "Unknown",
      total_amount: inv.total_amount ?? 0,
      status: inv.status ?? "draft",
      date: inv.issued_at ? formatDateOnly(inv.issued_at) : "—",
    })) ?? [];

  const [businessRate, clientRates, incomeSummary, projected] = await Promise.all([
    getBusinessEffectiveRate(),
    getClientEffectiveRates(),
    getIncomeSummary(),
    getProjectedAnnual(),
  ]);

  const mostProfitableClient = [...clientRates]
    .filter((c) => c.effectiveRate != null && c.totalHours > 0)
    .sort((a, b) => (b.effectiveRate ?? 0) - (a.effectiveRate ?? 0))[0] ?? null;

  return (
    <DashboardContent
      unbilledTotal={unbilledTotal}
      unbilledLogCount={unbilledLogCount}
      unbilledMissingRateCount={unbilledMissingRateCount}
      weekMinutes={weekMinutes}
      receivedTotal={receivedTotal}
      heatmapData={heatmapData}
      recentLogs={recentLogs}
      recentInvoices={recentInvoices}
      effectiveRate={businessRate.effectiveRate}
      targetRate={businessRate.targetRate}
      mostProfitableClient={
        mostProfitableClient
          ? {
              name: mostProfitableClient.clientName,
              effectiveRate: mostProfitableClient.effectiveRate!,
            }
          : null
      }
      incomeSummary={incomeSummary}
      projectedAnnual={projected.projected}
      annualGoal={projected.annualGoal}
    />
  );
}
