import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvoicesContent } from "./invoices-content";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      id, status, total_amount, currency, created_at, issued_at, due_at,
      client_id, project_id,
      clients(id, name),
      projects(id, name)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

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
      invoices={invoices ?? []}
      clients={clients ?? []}
      projects={projects}
    />
  );
}
