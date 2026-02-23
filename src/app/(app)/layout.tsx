import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile: { logo_url: string | null; full_name: string | null; business_name: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("logo_url, full_name, business_name")
      .eq("id", user.id)
      .single();
    profile = data;
  }
  return (
    <AppShell
      logoUrl={profile?.logo_url ?? null}
      displayName={
        profile?.business_name?.trim() ||
        profile?.full_name?.trim() ||
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "?"
      }
    >
      {children}
    </AppShell>
  );
}
