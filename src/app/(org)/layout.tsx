import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrgShell } from "@/components/org-shell";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { isOrganizationMember } from "@/lib/auth/routing";
import { getOrgContext } from "@/app/actions/organizations";

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await isOrganizationMember(supabase, user.id))) {
    redirect("/");
  }

  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const [{ data: soloClient }, { data: profile }] = await Promise.all([
    supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .is("organization_id", null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, business_name, onboarding_completed_at")
      .eq("id", user.id)
      .single(),
  ]);

  const displayName =
    profile?.business_name?.trim() ||
    profile?.full_name?.trim() ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "?";
  const showOnboarding = !profile?.onboarding_completed_at;

  return (
    <OnboardingGate show={showOnboarding} variant="org" displayName={displayName}>
      <OrgShell orgName={ctx.org.name} hasContractorDashboard={Boolean(soloClient)}>
        {children}
      </OrgShell>
    </OnboardingGate>
  );
}
