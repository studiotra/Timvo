import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, logo_url, bank_name, bank_account, bank_routing, tax_rate, tax_id, default_currency, invoice_prefix, default_invoice_footer, default_invoice_terms, default_due_days")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-2xl space-y-7">
      <section>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Profile
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-3.5">
            <span className="text-[13px] font-medium text-gray-200">Full Name</span>
            <span className="font-mono text-[12px] font-medium text-[var(--text-secondary)]">
              {user.user_metadata?.full_name ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-3.5">
            <span className="text-[13px] font-medium text-gray-200">Email</span>
            <span className="font-mono text-[12px] font-medium text-[var(--text-secondary)]">
              {user.email ?? "—"}
            </span>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          Name and email are managed via Supabase Auth.
        </p>
      </section>

      <SettingsForm profile={profile} />
    </div>
  );
}
