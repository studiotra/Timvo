import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ServicesSection } from "../settings/services-section";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: services } = await supabase
    .from("services")
    .select("id, name, default_rate, billing_type")
    .eq("user_id", user.id)
    .order("name");

  return (
    <div className="max-w-2xl">
      <ServicesSection services={services ?? []} />
    </div>
  );
}
