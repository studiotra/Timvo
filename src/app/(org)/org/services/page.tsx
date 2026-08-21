import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ServicesSection } from "@/app/(app)/settings/services-section";

export default async function OrgServicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: services } = await supabase
    .from("services")
    .select("id, name, default_rate, billing_type")
    .eq("user_id", user.id)
    .order("name");

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Services</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Your service catalog for tagging time on organization clients and projects.
      </p>
      <ServicesSection services={services ?? []} />
    </div>
  );
}
