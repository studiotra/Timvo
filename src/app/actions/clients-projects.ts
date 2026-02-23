"use server";

import { createClient } from "@/lib/supabase/server";

export type ClientOpt = { id: string; name: string };
export type ProjectOpt = { id: string; name: string; client_id: string };

export async function getClientsForSelect(): Promise<ClientOpt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");
  return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
}

export async function getProjectsByClient(clientId: string): Promise<ProjectOpt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !clientId) return [];
  const { data } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("name");
  return (data ?? []).map((p) => ({ id: p.id, name: p.name, client_id: p.client_id }));
}
