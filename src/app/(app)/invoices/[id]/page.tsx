import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { InvoiceDetailContent } from "./invoice-detail-content";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Select only columns that exist in base schema (+ stripe); footer/terms need 20250219000000_invoice_extras migration
  const { data: inv, error: invError } = await supabase
    .from("invoices")
    .select("id, status, total_amount, currency, issued_at, due_at, client_id, project_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (invError || !inv) notFound();

  // Optional: fetch footer/terms if columns exist (requires invoice_extras migration)
  let footer = "";
  let terms = "";
  let stripePaymentUrl: string | null = null;
  const { data: invExtras, error: _extrasErr } = await supabase
    .from("invoices")
    .select("stripe_payment_url, footer, terms_and_conditions")
    .eq("id", id)
    .single();
  if (!_extrasErr && invExtras) {
    stripePaymentUrl = (invExtras as { stripe_payment_url?: string }).stripe_payment_url ?? null;
    footer = (invExtras as { footer?: string }).footer ?? "";
    terms = (invExtras as { terms_and_conditions?: string }).terms_and_conditions ?? "";
  }

  let client: { name?: string; email?: string } | null = null;
  let project: { name?: string } | null = null;

  if (inv.client_id) {
    const { data: c } = await supabase
      .from("clients")
      .select("name, email")
      .eq("id", inv.client_id)
      .single();
    client = c;
  }

  if (inv.project_id) {
    const { data: p } = await supabase
      .from("projects")
      .select("name")
      .eq("id", inv.project_id)
      .single();
    project = p;
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("id, description, quantity, unit_rate, amount, sort_order")
    .eq("invoice_id", id)
    .order("sort_order");

  return (
    <div className="max-w-3xl">
      <Link
        href="/invoices"
        className="mb-6 inline-block text-sm text-[var(--text-secondary)] hover:text-accent"
      >
        ← Back to Invoices
      </Link>

      <InvoiceDetailContent
        invoice={{
          id: inv.id,
          status: inv.status ?? "draft",
          total_amount: Number(inv.total_amount) ?? 0,
          currency: inv.currency ?? "USD",
          issued_at: inv.issued_at ?? "",
          due_at: inv.due_at ?? "",
          stripe_payment_url: stripePaymentUrl,
          footer,
          terms_and_conditions: terms,
        }}
        client={client}
        project={project}
        items={(items ?? []).map((i) => ({
          id: i.id,
          description: i.description ?? "",
          quantity: Number(i.quantity) ?? 0,
          unit_rate: Number(i.unit_rate) ?? 0,
          amount: Number(i.amount) ?? 0,
          sort_order: i.sort_order ?? 0,
        }))}
      />
    </div>
  );
}
