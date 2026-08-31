import type { SupabaseClient } from "@supabase/supabase-js";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

type InvoiceDates = {
  status: string;
  due_at?: string | null;
};

/** Display status — sent/overdue invoices past due_at show as overdue. */
export function resolveInvoiceDisplayStatus(inv: InvoiceDates): InvoiceStatus {
  const base = (inv.status ?? "draft") as InvoiceStatus;
  if (base === "paid") return "paid";
  if (base === "overdue") return "overdue";
  if (base === "sent" && inv.due_at) {
    const due = new Date(inv.due_at);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) return "overdue";
  }
  return base;
}

/** Map UI status to DB column (overdue is stored as sent until cron marks it). */
export function invoiceStatusForDb(status: string): InvoiceStatus {
  if (status === "overdue") return "sent";
  if (["draft", "sent", "paid"].includes(status)) return status as InvoiceStatus;
  return "draft";
}

/** Persist overdue flag in DB for sent invoices past due date. */
export async function markOverdueInvoices(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("invoices")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "sent")
    .lt("due_at", today);

  if (error || !data?.length) return 0;

  const ids = data.map((r) => r.id);
  await supabase
    .from("invoices")
    .update({ status: "overdue", updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", userId);

  return ids.length;
}
