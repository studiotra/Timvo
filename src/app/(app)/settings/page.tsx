import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { SlackSettings } from "./slack-settings";
import { QuickBooksSettings } from "./quickbooks-settings";
import { StripeConnectSettings } from "./stripe-connect-settings";
import { AgencyConnectionsSettings } from "@/components/agency-connections-settings";
import { getContractorOrganizations } from "@/app/actions/organizations";
import { t, parseLocale } from "@/lib/i18n";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ slack?: string; quickbooks?: string; stripe?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_name, logo_url, phone_number, address, bank_name, bank_account, bank_routing, tax_rate, tax_id, default_currency, invoice_prefix, default_invoice_footer, default_invoice_terms, default_due_days, locale, timezone, target_hourly_rate, annual_income_goal, stripe_account_id, stripe_connect_charges_enabled, stripe_connect_onboarding_complete, subscription_tier")
    .eq("id", user.id)
    .single();

  const locale = parseLocale(profile?.locale);

  const [{ data: slackConn }, { data: qbConn }, organizations] = await Promise.all([
    supabase
      .from("slack_connections")
      .select("slack_team_name, slack_user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("quickbooks_connections")
      .select("company_name, realm_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    getContractorOrganizations(),
  ]);

  return (
    <div className="max-w-2xl space-y-7">
      <section>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {t(locale, "settings.profile")}
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-5 py-3.5">
          <span className="text-[13px] font-medium text-[var(--text-primary)]">{t(locale, "settings.email")}</span>
          <span className="font-mono text-[12px] font-medium text-[var(--text-secondary)]">
            {user.email ?? "—"}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          {t(locale, "settings.emailHint")}
        </p>
      </section>

      <AgencyConnectionsSettings organizations={organizations} />

      <SlackSettings
        connection={slackConn}
        configured={Boolean(process.env.SLACK_CLIENT_ID)}
        flash={params.slack ?? null}
      />

      <QuickBooksSettings
        connection={qbConn}
        configured={Boolean(process.env.QUICKBOOKS_CLIENT_ID)}
        flash={params.quickbooks ?? null}
        subscriptionTier={profile?.subscription_tier ?? null}
      />

      <StripeConnectSettings
        profile={
          profile
            ? {
                stripe_account_id: profile.stripe_account_id ?? null,
                stripe_connect_charges_enabled: profile.stripe_connect_charges_enabled ?? null,
                stripe_connect_onboarding_complete:
                  profile.stripe_connect_onboarding_complete ?? null,
                subscription_tier: profile.subscription_tier ?? null,
              }
            : null
        }
        configured={Boolean(process.env.STRIPE_SECRET_KEY)}
        flash={params.stripe ?? null}
      />

      <SettingsForm profile={profile} />
    </div>
  );
}
