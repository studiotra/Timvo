import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicInvoiceView } from "./public-invoice-view";
import { resolveInvoiceDisplayStatus } from "@/lib/invoices/status";
import { resolveDisplayMoney, resolveTaxRate } from "@/lib/invoices/money";
import { resolveTimezone } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const { token } = await params;
  const { paid } = await searchParams;

  if (!token?.trim()) notFound();

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (e) {
    console.error("Admin client init failed (missing SUPABASE_SERVICE_ROLE_KEY?):", e);
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 max-w-md text-center">
          <p className="font-semibold text-amber-400">Invoice service temporarily unavailable</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">Please contact the sender for a PDF copy of the invoice.</p>
        </div>
      </div>
    );
  }

  const { data: inv, error } = await supabase
    .from("invoices")
    .select("id, user_id, status, total_amount, currency, issued_at, due_at, stripe_payment_url, footer, terms_and_conditions, client_id, project_id")
    .eq("view_token", token)
    .single();

  if (error) {
    console.error("Invoice fetch error:", error.message, error.code);
    notFound();
  }
  if (!inv) notFound();

  const { data: client } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", inv.client_id)
    .single();

  const { data: project } = inv.project_id
    ? await supabase.from("projects").select("name, tax_rate, billing_type").eq("id", inv.project_id).single()
    : { data: null };

  const { data: items } = await supabase
    .from("invoice_items")
    .select("id, description, quantity, unit_rate, amount, sort_order")
    .eq("invoice_id", inv.id)
    .order("sort_order");

  const userId = (inv as { user_id?: string }).user_id;
  let businessInfo = {
    name: "Your Business",
    logoUrl: null as string | null,
    phone: null as string | null,
    address: null as string | null,
  };
  let defaultFooter = "";
  let defaultTerms = "";
  let ownerTimezone = resolveTimezone(null);
  let profileTaxRate: number | null = null;
  if (userId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select(
        "business_name, logo_url, full_name, phone_number, address, default_invoice_footer, default_invoice_terms, tax_rate, timezone"
      )
      .eq("id", userId)
      .single();
    businessInfo = {
      name: prof?.business_name?.trim() || prof?.full_name?.trim() || "Your Business",
      logoUrl: prof?.logo_url ?? null,
      phone: prof?.phone_number ?? null,
      address: prof?.address ?? null,
    };
    defaultFooter = prof?.default_invoice_footer?.trim() ?? "";
    defaultTerms = prof?.default_invoice_terms?.trim() ?? "";
    ownerTimezone = resolveTimezone(prof?.timezone);
    profileTaxRate = prof?.tax_rate != null ? Number(prof.tax_rate) : null;
  }
  const taxRate = resolveTaxRate(
    (project as { tax_rate?: number | null } | null)?.tax_rate,
    profileTaxRate
  );
  const money = resolveDisplayMoney(
    (items ?? []).map((i) => ({ amount: Number(i.amount) ?? 0 })),
    inv.total_amount,
    taxRate
  );

  const displayStatus = resolveInvoiceDisplayStatus(
    {
      status: inv.status ?? "sent",
      due_at: inv.due_at,
      total_amount: money.total,
    },
    ownerTimezone
  );

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      <PublicInvoiceView
        businessInfo={businessInfo}
        invoice={{
          id: inv.id,
          status: displayStatus,
          total_amount: money.total,
          subtotal: money.taxRate != null ? money.subtotal : undefined,
          tax_rate: money.taxRate,
          tax_amount: money.taxRate != null ? money.taxAmount : undefined,
          currency: inv.currency ?? "USD",
          issued_at: inv.issued_at ?? "",
          due_at: inv.due_at ?? "",
          stripe_payment_url: (inv as { stripe_payment_url?: string | null }).stripe_payment_url ?? null,
          footer: ((inv as { footer?: string }).footer ?? "").trim() || defaultFooter,
          terms_and_conditions:
            ((inv as { terms_and_conditions?: string }).terms_and_conditions ?? "").trim() ||
            defaultTerms,
        }}
        client={client}
        project={project}
        isFixedProject={(project as { billing_type?: string })?.billing_type === "fixed"}
        items={(items ?? []).map((i) => ({
          id: i.id,
          description: i.description ?? "",
          quantity: Number(i.quantity) ?? 0,
          unit_rate: Number(i.unit_rate) ?? 0,
          amount: Number(i.amount) ?? 0,
          sort_order: i.sort_order ?? 0,
        }))}
        paidSuccess={paid === "1"}
      />
    </div>
  );
}
