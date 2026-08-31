import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { InvoiceDetailContent } from "./invoice-detail-content";
import { markOverdueInvoices, resolveInvoiceDisplayStatus } from "@/lib/invoices/status";
import { fetchInvoiceOptionalFields } from "@/lib/invoices/optional-fields";
import { publicInvoiceUrl } from "@/lib/app-url";

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

  await markOverdueInvoices(supabase, user.id);

  // Base columns only — optional fields fetched separately if migrations exist
  const { data: inv, error: invError } = await supabase
    .from("invoices")
    .select("id, status, total_amount, currency, issued_at, due_at, client_id, project_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (invError || !inv) notFound();

  const extras = await fetchInvoiceOptionalFields(supabase, id);

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

  const displayStatus = resolveInvoiceDisplayStatus({
    status: inv.status ?? "draft",
    due_at: inv.due_at,
  });

  const clientViewUrl =
    extras.viewToken &&
    (displayStatus === "sent" || displayStatus === "overdue" || displayStatus === "paid")
      ? publicInvoiceUrl(extras.viewToken)
      : null;

  return (
    <div className="max-w-3xl">
      <Link
        href="/invoices"
        className="mb-6 inline-block text-sm text-[var(--text-secondary)] hover:text-accent"
      >
        ← Back to Invoices
      </Link>

      {clientViewUrl && (
        <p className="mb-4 text-[12px] text-[var(--text-muted)]">
          Client link:{" "}
          <a href={clientViewUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
            {clientViewUrl}
          </a>
        </p>
      )}

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
          stripe_payment_url: extras.stripePaymentUrl,
          stripe_session_id: extras.stripeSessionId,
          paid_at: extras.paidAt,
          footer: extras.footer,
          terms_and_conditions: extras.terms,
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
