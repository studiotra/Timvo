import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ServicesSection } from "@/app/(app)/settings/services-section";

export default async function OrgServicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let archiveSupported = true;
  let services: Array<{
    id: string;
    name: string;
    default_rate: number | null;
    billing_type: string | null;
    status?: string | null;
  }> = [];

  const withStatus = await supabase
    .from("services")
    .select("id, name, default_rate, billing_type, status")
    .eq("user_id", user.id)
    .order("name");

  if (withStatus.error) {
    archiveSupported = false;
    const { data } = await supabase
      .from("services")
      .select("id, name, default_rate, billing_type")
      .eq("user_id", user.id)
      .order("name");
    services = (data ?? []).map((s) => ({ ...s, status: "active" }));
  } else {
    services = (withStatus.data ?? []).map((s) => ({
      ...s,
      status: s.status ?? "active",
    }));
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Services</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Your service catalog for tagging time on organization clients and projects.
      </p>
      <ServicesSection
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          default_rate: s.default_rate,
          billing_type: (s.billing_type as "hourly" | "fixed") ?? "hourly",
          status: (s.status as "active" | "archived") ?? "active",
        }))}
        archiveSupported={archiveSupported}
      />
    </div>
  );
}
