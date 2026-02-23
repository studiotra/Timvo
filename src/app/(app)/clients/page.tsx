import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientsPageClient } from "./clients-page-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <ClientsPageClient />;
}
