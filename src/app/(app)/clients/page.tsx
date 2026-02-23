import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientsContent } from "./clients-content";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, tax_id, currency, created_at")
    .eq("user_id", user.id)
    .order("name");

  const { data: projectCounts } = await supabase
    .from("projects")
    .select("client_id")
    .in(
      "client_id",
      (clients ?? []).map((c) => c.id)
    );

  const counts = (projectCounts ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.client_id] = (acc[p.client_id] ?? 0) + 1;
    return acc;
  }, {});

  const clientsWithCounts = (clients ?? []).map((c) => ({
    ...c,
    project_count: counts[c.id] ?? 0,
  }));

  const { data: projectsRaw } = await supabase
    .from("projects")
    .select("id, name, client_id, hourly_rate, billing_type, status, clients(name)")
    .in("client_id", (clients ?? []).map((c) => c.id))
    .order("name");

  const projects =
    projectsRaw?.map((p) => {
      const c = p.clients as { name?: string } | null;
      return {
        id: p.id,
        name: p.name,
        clientId: p.client_id,
        clientName: c?.name ?? "Unknown",
        hourly_rate: p.hourly_rate,
        billing_type: p.billing_type ?? "hourly",
        status: p.status ?? "active",
      };
    }) ?? [];

  return (
    <ClientsContent clients={clientsWithCounts} projects={projects} />
  );
}
