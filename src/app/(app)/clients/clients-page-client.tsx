"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClientsContent } from "./clients-content";
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

export function ClientsPageClient({
  initialClients,
  initialProjects,
}: {
  initialClients: ClientListItem[];
  initialProjects: ProjectRow[];
}) {
  const [clients, setClients] = useState(initialClients);
  const [projects, setProjects] = useState(initialProjects);

  useEffect(() => {
    setClients(initialClients);
    setProjects(initialProjects);
  }, [initialClients, initialProjects]);

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: clientsData } = await supabase
      .from("clients")
      .select(
        "id, name, email, tax_id, currency, status, address, phone_number, business_phone, extension, note, created_at"
      )
      .eq("user_id", user.id)
      .order("name");

    const clientsList = clientsData ?? [];
    if (clientsList.length === 0) {
      setClients([]);
      setProjects([]);
      return;
    }

    const clientIds = clientsList.map((c) => c.id);
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, name, client_id, hourly_rate, billing_type, status, clients(name)")
      .in("client_id", clientIds)
      .order("name");

    const nextProjects: ProjectRow[] = (projectsData ?? []).map((p) => {
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

    const counts = nextProjects.reduce<Record<string, number>>((acc, p) => {
      acc[p.clientId] = (acc[p.clientId] ?? 0) + 1;
      return acc;
    }, {});

    setClients(
      clientsList.map((c) => ({ ...c, project_count: counts[c.id] ?? 0 }))
    );
    setProjects(nextProjects);
  }, []);

  return (
    <ClientsContent clients={clients} projects={projects} onRefresh={refetch} />
  );
}
