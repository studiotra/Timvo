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
      .select("name, tax_rate, billing_type")
      .eq("id", inv.project_id)
      .single();
    project = p;
  }
  const isFixedProject = (project as { billing_type?: string })?.billing_type === "fixed";

  const { data: items } = await supabase
    .from("invoice_items")
    .select("id, description, quantity, unit_rate, amount, sort_order")
    .eq("invoice_id", id)
    .order("sort_order");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, logo_url, full_name, phone_number, address, tax_rate")
    .eq("id", user.id)
    .single();

  const projectTaxRate = (project as { tax_rate?: number | null })?.tax_rate;
  const profileTaxRate = profile?.tax_rate;
  const taxRate = projectTaxRate != null && projectTaxRate > 0
    ? Number(projectTaxRate)
    : profileTaxRate != null && profileTaxRate > 0
      ? Number(profileTaxRate)
      : null;
  const subtotal = (items ?? []).reduce((s, i) => s + Number(i.amount || 0), 0);
  const taxAmount = taxRate != null ? Math.round(subtotal * (taxRate / 100) * 100) / 100 : 0;
  const totalWithTax = inv.status === "draft" ? subtotal + taxAmount : Number(inv.total_amount) ?? subtotal;

  const businessName = profile?.business_name?.trim() || profile?.full_name?.trim() || "Your Business";
  const businessInfo = {
    name: businessName,
    logoUrl: profile?.logo_url ?? null,
    phone: profile?.phone_number ?? null,
    address: profile?.address ?? null,
  };

  const baseStatus = inv.status ?? "draft";
  const displayStatus =
    baseStatus === "sent" && inv.due_at
      ? (() => {
          const due = new Date(inv.due_at);
          due.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return due < today ? "overdue" : "sent";
        })()
      : baseStatus;

  return (
    <div className="max-w-3xl">
      <Link
        href="/invoices"
        className="mb-6 inline-block text-sm text-[var(--text-secondary)] hover:text-accent"
      >
        ← Back to Invoices
      </Link>

      <InvoiceDetailContent
        businessInfo={businessInfo}
        invoice={{
          id: inv.id,
          status: displayStatus,
          total_amount: totalWithTax,
          subtotal: taxRate != null ? subtotal : undefined,
          tax_rate: taxRate ?? undefined,
          tax_amount: taxRate != null ? taxAmount : undefined,
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
        isFixedProject={isFixedProject}
      />
    </div>
  );
}
