import type { SupabaseClient } from "@supabase/supabase-js";
import { isOverdueByDate, localToday, resolveTimezone } from "@/lib/dates";
import { isZeroMoneyTotal } from "@/lib/invoices/money";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

type InvoiceDates = {
  status: string;
  due_at?: string | null;
  /** Tax-inclusive total — $0 invoices never display as overdue. */
  total_amount?: number | null;
};

/** Display status — sent/overdue invoices past due_at show as overdue. */
export function resolveInvoiceDisplayStatus(
  inv: InvoiceDates,
  timeZone?: string | null,
  now: Date = new Date()
): InvoiceStatus {
  const base = (inv.status ?? "draft") as InvoiceStatus;
  if (base === "paid") return "paid";
  // $0 invoices are never overdue (nothing to collect)
  const zeroTotal = isZeroMoneyTotal(inv.total_amount);
  if (base === "overdue") return zeroTotal ? "sent" : "overdue";
  if (base === "sent" && inv.due_at && !zeroTotal) {
    if (isOverdueByDate(inv.due_at, resolveTimezone(timeZone), now)) {
      return "overdue";
    }
  }
  return base;
}

/** Map UI status to DB column (overdue is stored as sent until cron marks it). */
export function invoiceStatusForDb(status: string): InvoiceStatus {
  if (status === "overdue") return "sent";
  if (["draft", "sent", "paid"].includes(status)) return status as InvoiceStatus;
  return "draft";
}

/** Persist overdue flag in DB for sent invoices past due date (user's local today). */
export async function markOverdueInvoices(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  const today = localToday(resolveTimezone(profile?.timezone));

  const { data, error } = await supabase
    .from("invoices")
    .select("id, total_amount")
    .eq("user_id", userId)
    .eq("status", "sent")
    .lt("due_at", today);

  if (error || !data?.length) return 0;

  // Never mark $0 invoices overdue
  const ids = data
    .filter((r) => !isZeroMoneyTotal(r.total_amount))
    .map((r) => r.id);
  if (ids.length === 0) return 0;
  const { error: updateError } = await supabase
    .from("invoices")
    .update({ status: "overdue", updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", userId);

  if (updateError) return 0;

  return ids.length;
}
