import type { SupabaseClient } from "@supabase/supabase-js";

export type InvoiceOptionalFields = {
  footer: string;
  terms: string;
  stripePaymentUrl: string | null;
  stripeSessionId: string | null;
  viewToken: string | null;
  paidAt: string | null;
};

/** Fetch invoice columns that may not exist until later migrations are applied. */
export async function fetchInvoiceOptionalFields(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<InvoiceOptionalFields> {
  const result: InvoiceOptionalFields = {
    footer: "",
    terms: "",
    stripePaymentUrl: null,
    stripeSessionId: null,
    viewToken: null,
    paidAt: null,
  };

  const { data: base } = await supabase
    .from("invoices")
    .select("stripe_payment_url, footer, terms_and_conditions")
    .eq("id", invoiceId)
    .maybeSingle();

  if (base) {
    result.stripePaymentUrl =
      (base as { stripe_payment_url?: string | null }).stripe_payment_url ?? null;
    result.footer = (base as { footer?: string }).footer ?? "";
    result.terms = (base as { terms_and_conditions?: string }).terms_and_conditions ?? "";
  }

  const { data: tokenRow } = await supabase
    .from("invoices")
    .select("view_token")
    .eq("id", invoiceId)
    .maybeSingle();
  if (tokenRow) {
    result.viewToken = (tokenRow as { view_token?: string | null }).view_token ?? null;
  }

  const { data: paymentRow } = await supabase
    .from("invoices")
    .select("stripe_session_id, paid_at")
    .eq("id", invoiceId)
    .maybeSingle();
  if (paymentRow) {
    result.stripeSessionId =
      (paymentRow as { stripe_session_id?: string | null }).stripe_session_id ?? null;
    result.paidAt = (paymentRow as { paid_at?: string | null }).paid_at ?? null;
  }

  return result;
}
