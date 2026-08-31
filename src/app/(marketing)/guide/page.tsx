import { GuidePageClient } from "@/components/guide/guide-page";
import { GuidePublicShell } from "@/components/guide/guide-public-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Help center — Timvo",
  description: "Step-by-step guide for contractors and agencies using Timvo.",
};

export default async function PublicGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const defaultTab = tab === "agency" ? "agency" : "contractor";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <GuidePublicShell>
      <GuidePageClient
        defaultTab={defaultTab}
        showRestartTour={Boolean(user)}
      />
    </GuidePublicShell>
  );
}
