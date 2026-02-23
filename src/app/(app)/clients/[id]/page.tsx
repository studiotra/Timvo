import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProjectContent } from "./project-content";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email, tax_id, currency")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!client) {
    notFound();
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, hourly_rate, billing_type, status")
    .eq("client_id", id)
    .order("name");

  return (
    <div className="p-6">
      <ProjectContent client={client} projects={projects ?? []} />
    </div>
  );
}
