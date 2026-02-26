import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientPortalShell } from "./client-portal-shell";

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: portalAccess } = await supabase
    .from("client_portal_access")
    .select("id, invited_by")
    .eq("user_id", user.id)
    .limit(1);

  if (!portalAccess?.length) {
    redirect("/");
  }

  const invitorId = portalAccess[0]?.invited_by;
  let invitorBusinessName = "Client Portal";
  if (invitorId) {
    const { data: invitorProfile } = await supabase
      .from("profiles")
      .select("business_name, full_name")
      .eq("id", invitorId)
      .single();
    invitorBusinessName =
      (invitorProfile?.business_name?.trim()) ||
      invitorProfile?.full_name?.trim() ||
      "Client Portal";
  }

  const { data: ownedClient } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <ClientPortalShell
        invitorBusinessName={invitorBusinessName}
        hasBusinessDashboard={!!ownedClient}
      />
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  );
}
