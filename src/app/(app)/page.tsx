import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // Unbilled total
  const { data: unbilledLogs } = await supabase
    .from("time_logs")
    .select("duration_minutes, projects(hourly_rate)")
    .eq("user_id", user.id)
    .eq("is_billable", true)
    .eq("is_billed", false);

  let unbilledTotal = 0;
  if (unbilledLogs) {
    for (const log of unbilledLogs) {
      const proj = log.projects as { hourly_rate?: number } | null | undefined;
      const rate = Number(proj?.hourly_rate) || 0;
      const hours = (log.duration_minutes ?? 0) / 60;
      unbilledTotal += hours * rate;
    }
  }

  // Week stats
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: weekLogs } = await supabase
    .from("time_logs")
    .select("started_at, duration_minutes")
    .eq("user_id", user.id)
    .gte("started_at", weekStart.toISOString())
    .lt("started_at", weekEnd.toISOString());

  const weekMinutes =
    weekLogs?.reduce((s, l) => s + (l.duration_minutes ?? 0), 0) ?? 0;

  const dayMinutes = [0, 0, 0, 0, 0, 0, 0];
  if (weekLogs) {
    for (const log of weekLogs) {
      const d = new Date(log.started_at);
      const dayIdx = (d.getDay() + 6) % 7;
      dayMinutes[dayIdx] += log.duration_minutes ?? 0;
    }
  }
  const maxDay = Math.max(...dayMinutes, 1);
  const heatmapData = dayMinutes.map((m) => m / maxDay);

  // Received this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: paidInvoices } = await supabase
    .from("invoices")
    .select("total_amount")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .gte("created_at", monthStart.toISOString());

  const receivedTotal =
    paidInvoices?.reduce((s, i) => s + (Number(i.total_amount) ?? 0), 0) ?? 0;

  // Recent logs
  const { data: recentLogsRaw } = await supabase
    .from("time_logs")
    .select("id, description, duration_minutes, is_billed, projects(name, hourly_rate)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(10);

  const recentLogs =
    recentLogsRaw?.map((l) => {
      const proj = l.projects as { name?: string; hourly_rate?: number } | null;
      const rate = Number(proj?.hourly_rate) || 0;
      const hours = (l.duration_minutes ?? 0) / 60;
      const amount = hours * rate;
      const projectName = proj?.name ?? "Unknown";
      const colorKeys = Object.keys(PROJECT_COLORS).filter((k) => k !== "default");
      return {
        id: l.id,
        description: l.description,
        duration_minutes: l.duration_minutes ?? 0,
        amount,
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
      date: inv.issued_at
        ? new Date(inv.issued_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "—",
    })) ?? [];

  return (
    <DashboardContent
      unbilledTotal={unbilledTotal}
      weekMinutes={weekMinutes}
      receivedTotal={receivedTotal}
      heatmapData={heatmapData}
      recentLogs={recentLogs}
      recentInvoices={recentInvoices}
    />
  );
}
