"use server";

import { createClient } from "@/lib/supabase/server";
import { getClientsForSelect, getProjectsByClient } from "./clients-projects";

export type ClientOption = { id: string; name: string };
export type ProjectOption = { id: string; name: string; client_id: string };

export async function getClientsForTimer(): Promise<ClientOption[]> {
  return getClientsForSelect();
}

export async function getProjectsForTimer(clientId: string): Promise<ProjectOption[]> {
  return getProjectsByClient(clientId);
}

export type ActiveTimer = {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  startedAt: string;
} | null;

export async function getActiveTimer(): Promise<ActiveTimer> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("time_logs")
    .select("id, started_at, projects(id, name, clients(name))")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.projects) return null;
  const proj = data.projects as unknown as { id: string; name: string; clients?: { name?: string } };
  return {
    id: data.id,
    projectId: proj.id,
    projectName: proj.name ?? "",
    clientName: proj.clients?.name ?? "",
    startedAt: data.started_at,
  };
}
