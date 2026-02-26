"use server";

import { createClient } from "@/lib/supabase/server";

export type IncomeSummary = {
  currentMonth: number;
  lastMonth: number;
  ytd: number;
};

export type ProjectedAnnual = {
  projected: number;
  avgLast3Months: number;
  annualGoal: number | null;
};

/** Revenue from paid invoices by period. Uses issued_at, falls back to created_at. */
function getDate(row: { issued_at?: string | null; created_at?: string | null }): Date | null {
  const d = row.issued_at ?? row.created_at;
  return d ? new Date(d) : null;
}

export async function getIncomeSummary(): Promise<IncomeSummary> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { currentMonth: 0, lastMonth: 0, ytd: 0 };

  const { data: invoices } = await supabase
    .from("invoices")
    .select("total_amount, issued_at, created_at")
    .eq("user_id", user.id)
    .eq("status", "paid");

  const paid = (invoices ?? []).filter((i) => i.total_amount != null);
  const now = new Date();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const currentMonth = paid
    .filter((i) => {
      const d = getDate(i);
      return d && d >= monthStart;
    })
    .reduce((s, i) => s + Number(i.total_amount), 0);

  const lastMonth = paid
    .filter((i) => {
      const d = getDate(i);
      return d && d >= lastMonthStart && d <= lastMonthEnd;
    })
    .reduce((s, i) => s + Number(i.total_amount), 0);

  const ytd = paid
    .filter((i) => {
      const d = getDate(i);
      return d && d >= yearStart;
    })
    .reduce((s, i) => s + Number(i.total_amount), 0);

  return { currentMonth, lastMonth, ytd };
}

/** Projected annual = average of last 3 months × 12. */
export async function getProjectedAnnual(): Promise<ProjectedAnnual> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { projected: 0, avgLast3Months: 0, annualGoal: null };

  const { data: invoices } = await supabase
    .from("invoices")
    .select("total_amount, issued_at, created_at")
    .eq("user_id", user.id)
    .eq("status", "paid");

  const { data: profile } = await supabase
    .from("profiles")
    .select("annual_income_goal")
    .eq("id", user.id)
    .single();

  const paid = (invoices ?? []).filter((i) => i.total_amount != null);
  const now = new Date();

  const amounts: number[] = [];
  for (let m = 2; m >= 0; m--) {
    const start = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59);
    const sum = paid
      .filter((i) => {
        const d = getDate(i);
        return d && d >= start && d <= end;
      })
      .reduce((s, i) => s + Number(i.total_amount), 0);
    amounts.push(sum);
  }

  const avgLast3Months = amounts.reduce((a, b) => a + b, 0) / 3;
  const projected = avgLast3Months * 12;
  const annualGoal = profile?.annual_income_goal != null ? Number(profile.annual_income_goal) : null;

  return { projected, avgLast3Months, annualGoal };
}
