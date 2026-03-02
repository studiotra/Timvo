import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicInvoiceView } from "./public-invoice-view";

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

  const supabase = createAdminClient();
  const { data: inv, error } = await supabase
    .from("invoices")
    .select("id, user_id, status, total_amount, currency, issued_at, due_at, stripe_payment_url, footer, terms_and_conditions, client_id, project_id")
    .eq("view_token", token)
    .single();

  if (error || !inv) notFound();

  const { data: client } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", inv.client_id)
    .single();

  const { data: project } = inv.project_id
    ? await supabase.from("projects").select("name").eq("id", inv.project_id).single()
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
  if (userId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("business_name, logo_url, full_name, phone_number, address")
      .eq("id", userId)
      .single();
    businessInfo = {
      name: prof?.business_name?.trim() || prof?.full_name?.trim() || "Your Business",
      logoUrl: prof?.logo_url ?? null,
      phone: prof?.phone_number ?? null,
      address: prof?.address ?? null,
    };
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      <PublicInvoiceView
        businessInfo={businessInfo}
        invoice={{
          id: inv.id,
          status: inv.status ?? "sent",
          total_amount: Number(inv.total_amount) ?? 0,
          currency: inv.currency ?? "USD",
          issued_at: inv.issued_at ?? "",
          due_at: inv.due_at ?? "",
          stripe_payment_url: (inv as { stripe_payment_url?: string | null }).stripe_payment_url ?? null,
          footer: (inv as { footer?: string }).footer ?? "",
          terms_and_conditions: (inv as { terms_and_conditions?: string }).terms_and_conditions ?? "",
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
        paidSuccess={paid === "1"}
      />
    </div>
  );
}
