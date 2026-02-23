"use server";

import { createClient } from "@/lib/supabase/server";

export type PeriodRevenue = { period: string; amount: number };

export async function getRevenueByPeriod(): Promise<PeriodRevenue[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, total_amount, issued_at, created_at")
    .eq("user_id", user.id)
    .eq("status", "paid");

  const paid = (invoices ?? []).filter((i) => i.total_amount != null);
  const results: PeriodRevenue[] = [];

  const getDate = (row: { issued_at?: string | null; created_at?: string | null }) => {
    const d = row.issued_at ?? row.created_at;
    return d ? new Date(d) : null;
  };

  const thisMonth = paid.filter((i) => {
    const d = getDate(i);
    return d && d >= startOfMonth;
  });
  results.push({
    period: `${now.toLocaleString("default", { month: "short" })} ${now.getFullYear()}`,
    amount: thisMonth.reduce((s, i) => s + Number(i.total_amount), 0),
  });

  const lastMonth = paid.filter((i) => {
    const d = getDate(i);
    return d && d >= startOfLastMonth && d <= endOfLastMonth;
  });
  results.push({
    period: `${startOfLastMonth.toLocaleString("default", { month: "short" })} ${startOfLastMonth.getFullYear()}`,
    amount: lastMonth.reduce((s, i) => s + Number(i.total_amount), 0),
  });

  const thisYear = paid.filter((i) => {
    const d = getDate(i);
    return d && d >= startOfYear;
  });
  results.push({
    period: `${now.getFullYear()} YTD`,
    amount: thisYear.reduce((s, i) => s + Number(i.total_amount), 0),
  });

  return results;
}

/** Fetch paid invoices with client info for revenue by client. */
export async function getRevenueByClient(): Promise<
  { clientId: string; clientName: string; amount: number }[]
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("invoices")
    .select("id, total_amount, client_id, clients(name)")
    .eq("user_id", user.id)
    .eq("status", "paid");

  const map = new Map<string, { name: string; amount: number }>();
  for (const r of rows ?? []) {
    if (r.total_amount == null) continue;
    const clientId = r.client_id as string;
    const name = (r.clients as { name?: string } | null)?.name ?? "Unknown";
    const existing = map.get(clientId);
    if (existing) {
      existing.amount += Number(r.total_amount);
    } else {
      map.set(clientId, { name, amount: Number(r.total_amount) });
    }
  }

  return [...map.entries()].map(([clientId, { name, amount }]) => ({
    clientId,
    clientName: name,
    amount,
  }));
}
