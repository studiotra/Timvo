import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (!portalAccess?.length) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <ClientPortalShell />
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  );
}
