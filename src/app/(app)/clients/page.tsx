import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientsPageClient } from "./clients-page-client";
import type { ClientListItem } from "@/types/database";

type ProjectRow = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  hourly_rate: number | null;
  billing_type: string;
  status: string;
};

async function loadClientsPageData(userId: string): Promise<{
  clients: ClientListItem[];
  projects: ProjectRow[];
}> {
  const supabase = await createClient();

  const { data: clientsData } = await supabase
    .from("clients")
    .select(
      "id, name, email, tax_id, currency, status, address, phone_number, business_phone, extension, note, created_at"
    )
    .eq("user_id", userId)
    .order("name");

  const clientsList = clientsData ?? [];
  if (clientsList.length === 0) {
    return { clients: [], projects: [] };
  }

  const clientIds = clientsList.map((c) => c.id);

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name, client_id, hourly_rate, billing_type, status, clients(name)")
    .in("client_id", clientIds)
    .order("name");

  const projects: ProjectRow[] = (projectsData ?? []).map((p) => {
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
  });

  const counts = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.clientId] = (acc[p.clientId] ?? 0) + 1;
    return acc;
  }, {});

  const clients: ClientListItem[] = clientsList.map((c) => ({
    ...c,
    project_count: counts[c.id] ?? 0,
  }));

  return { clients, projects };
}

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { clients, projects } = await loadClientsPageData(user.id);

  return (
    <ClientsPageClient initialClients={clients} initialProjects={projects} />
  );
}
