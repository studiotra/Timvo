import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { LocaleProvider } from "@/contexts/locale-context";
import { isPortalOnlyUser, isOrganizationPrimaryUser } from "@/lib/auth/routing";
import { parseLocale } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && (await isPortalOnlyUser(supabase, user.id))) {
    redirect("/client");
  }
  if (user && (await isOrganizationPrimaryUser(supabase, user.id))) {
    redirect("/org");
  }
  let profile: { logo_url: string | null; full_name: string | null; business_name: string | null; locale: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("logo_url, full_name, business_name, locale")
      .eq("id", user.id)
      .single();
    profile = data;
  }
  const locale = parseLocale(profile?.locale);

  return (
    <LocaleProvider locale={locale}>
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
    </LocaleProvider>
  );
}
