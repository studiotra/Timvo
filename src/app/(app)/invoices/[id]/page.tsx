import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { InvoiceDetailContent } from "./invoice-detail-content";
import { InvoiceClientLink } from "@/components/invoice-client-link";
import { ensureInvoiceViewToken } from "@/app/actions/ensure-invoice-view-token";
import { markOverdueInvoices, resolveInvoiceDisplayStatus } from "@/lib/invoices/status";
import { resolveDisplayMoney, resolveTaxRate } from "@/lib/invoices/money";
import { fetchInvoiceOptionalFields } from "@/lib/invoices/optional-fields";
import { normalizeInvoicePrefix } from "@/lib/invoices/number";
import { invoiceHasBeenEmailed } from "@/lib/invoices/client-link";
import { publicInvoiceUrl } from "@/lib/app-url";
import { fetchUserTimezone } from "@/lib/user-timezone";

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
  const timezone = await fetchUserTimezone(supabase, user.id);

  // Base columns only — optional fields fetched separately if migrations exist
  const { data: inv, error: invError } = await supabase
    .from("invoices")
    .select("id, status, total_amount, currency, issued_at, due_at, client_id, project_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (invError || !inv) notFound();

  const extras = await fetchInvoiceOptionalFields(supabase, id);

  let client: {
    name?: string;
    email?: string;
    address?: string | null;
    phone_number?: string | null;
    business_phone?: string | null;
  } | null = null;
  let project: { name?: string } | null = null;

  if (inv.client_id) {
    const { data: c } = await supabase
      .from("clients")
      .select("name, email, address, phone_number, business_phone")
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
    .select("id, description, quantity, unit_rate, amount, sort_order, time_log_id")
    .eq("invoice_id", id)
    .order("sort_order");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "business_name, logo_url, full_name, phone_number, address, tax_rate, default_invoice_footer, default_invoice_terms, invoice_prefix"
    )
    .eq("id", user.id)
    .single();

  const taxRate = resolveTaxRate(
    (project as { tax_rate?: number | null })?.tax_rate,
    profile?.tax_rate
  );
  const money = resolveDisplayMoney(
    (items ?? []).map((i) => ({ amount: Number(i.amount) ?? 0 })),
    inv.total_amount,
    taxRate
  );

  const businessName = profile?.business_name?.trim() || profile?.full_name?.trim() || "Your Business";
  const businessInfo = {
    name: businessName,
    logoUrl: profile?.logo_url ?? null,
    phone: profile?.phone_number ?? null,
    address: profile?.address ?? null,
  };

  const displayStatus = resolveInvoiceDisplayStatus(
    {
      status: inv.status ?? "draft",
      due_at: inv.due_at,
      total_amount: money.total,
    },
    timezone
  );

  // Auto-create a shareable client link for drafts (and any invoice missing a token).
  let viewToken = extras.viewToken;
  if (!viewToken) {
    const ensured = await ensureInvoiceViewToken(id);
    if ("viewToken" in ensured && ensured.viewToken) {
      viewToken = ensured.viewToken;
    }
  }
  const clientViewUrl = viewToken ? publicInvoiceUrl(viewToken) : null;

  return (
    <div className="max-w-3xl">
      <Link
        href="/invoices"
        className="no-print mb-6 inline-block text-sm text-[var(--text-secondary)] hover:text-accent"
      >
        ← Back to Invoices
      </Link>

      {clientViewUrl && <InvoiceClientLink url={clientViewUrl} />}

      <InvoiceDetailContent
        businessInfo={businessInfo}
        invoice={{
          id: inv.id,
          status: displayStatus,
          total_amount: money.total,
          subtotal: money.taxRate != null ? money.subtotal : undefined,
          tax_rate: money.taxRate ?? undefined,
          tax_amount: money.taxRate != null ? money.taxAmount : undefined,
          currency: inv.currency ?? "USD",
          issued_at: inv.issued_at ?? "",
          due_at: inv.due_at ?? "",
          stripe_payment_url: extras.stripePaymentUrl,
          stripe_session_id: extras.stripeSessionId,
          paid_at: extras.paidAt,
          footer: extras.footer.trim() || profile?.default_invoice_footer?.trim() || "",
          terms_and_conditions: extras.terms.trim() || profile?.default_invoice_terms?.trim() || "",
          invoice_number: extras.invoiceNumber,
          invoice_prefix: normalizeInvoicePrefix(
            (profile as { invoice_prefix?: string | null } | null)?.invoice_prefix
          ),
          has_been_emailed: invoiceHasBeenEmailed(displayStatus),
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
          time_log_id: (i as { time_log_id?: string | null }).time_log_id ?? null,
        }))}
        isFixedProject={isFixedProject}
      />
    </div>
  );
}
