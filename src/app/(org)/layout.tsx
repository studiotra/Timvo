import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrgShell } from "@/components/org-shell";
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

  const { data: soloClient } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .is("organization_id", null)
    .limit(1)
    .maybeSingle();

  return (
    <OrgShell orgName={ctx.org.name} hasContractorDashboard={Boolean(soloClient)}>
      {children}
    </OrgShell>
  );
}
