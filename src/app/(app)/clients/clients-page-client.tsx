"use client";

import { useEffect, useState } from "react";
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

export function ClientsPageClient() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, email, tax_id, currency, created_at")
      .eq("user_id", user.id)
      .order("name");
    const clientsList = clientsData ?? [];
    if (clientsList.length === 0) {
      setClients([]);
      setProjects([]);
      return;
    }
    const { data: countsData } = await supabase
      .from("projects")
      .select("client_id")
      .in("client_id", clientsList.map((c) => c.id));
    const counts = (countsData ?? []).reduce<Record<string, number>>(
      (acc, p) => {
        acc[p.client_id] = (acc[p.client_id] ?? 0) + 1;
        return acc;
      },
      {}
    );
    setClients(clientsList.map((c) => ({ ...c, project_count: counts[c.id] ?? 0 })));
    const { data: projectsData } = await supabase
      .from("projects")
      .select("id, name, client_id, hourly_rate, billing_type, status, clients(name)")
      .in("client_id", clientsList.map((c) => c.id))
      .order("name");
    setProjects(
      (projectsData ?? []).map((p) => {
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
      })
    );
  };

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name, email, tax_id, currency, created_at")
        .eq("user_id", user.id)
        .order("name");

      const clientsList = clientsData ?? [];
      if (clientsList.length === 0) {
        setClients([]);
        setProjects([]);
        setLoading(false);
        return;
      }

      const { data: countsData } = await supabase
        .from("projects")
        .select("client_id")
        .in("client_id", clientsList.map((c) => c.id));

      const counts = (countsData ?? []).reduce<Record<string, number>>(
        (acc, p) => {
          acc[p.client_id] = (acc[p.client_id] ?? 0) + 1;
          return acc;
        },
        {}
      );
      setClients(
        clientsList.map((c) => ({ ...c, project_count: counts[c.id] ?? 0 }))
      );

      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name, client_id, hourly_rate, billing_type, status, clients(name)")
        .in("client_id", clientsList.map((c) => c.id))
        .order("name");

      setProjects(
        (projectsData ?? []).map((p) => {
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
        })
      );
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-[var(--text-muted)]">
        Loading...
      </div>
    );
  }

  return (
    <ClientsContent
      clients={clients}
      projects={projects}
      onRefresh={refetch}
    />
  );
}
