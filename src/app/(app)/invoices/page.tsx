import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvoicesContent } from "./invoices-content";
import { markOverdueInvoices } from "@/lib/invoices/status";
import { normalizeInvoicePrefix } from "@/lib/invoices/number";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await markOverdueInvoices(supabase, user.id);

  // Prefer optional invoice_number; fall back if migration not applied
  let invoices: Array<{
    id: string;
    status: string;
    total_amount: number | null;
    currency: string | null;
    created_at: string;
    issued_at: string | null;
    due_at: string | null;
    client_id: string;
    project_id: string | null;
    invoice_number?: number | null;
    clients: unknown;
    projects: unknown;
  }> = [];

  const withNumber = await supabase
    .from("invoices")
    .select(`
      id, status, total_amount, currency, created_at, issued_at, due_at,
      client_id, project_id, invoice_number,
      clients(id, name),
      projects(id, name)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (withNumber.error) {
    const { data } = await supabase
      .from("invoices")
      .select(`
        id, status, total_amount, currency, created_at, issued_at, due_at,
        client_id, project_id,
        clients(id, name),
        projects(id, name)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    invoices = (data ?? []).map((row) => ({ ...row, invoice_number: null }));
  } else {
    invoices = withNumber.data ?? [];
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  const { data: profile } = await supabase
    .from("profiles")
    .select("invoice_prefix")
    .eq("id", user.id)
    .maybeSingle();

  const clientIds = (clients ?? []).map((c) => c.id);
  let projects: { id: string; name: string; client_id: string }[] = [];
  if (clientIds.length > 0) {
    const { data } = await supabase
      .from("projects")
      .select("id, name, client_id")
      .in("client_id", clientIds);
    projects = data ?? [];
  }

  return (
    <InvoicesContent
      invoices={invoices}
      clients={clients ?? []}
      projects={projects}
      invoicePrefix={normalizeInvoicePrefix(profile?.invoice_prefix)}
    />
  );
}
