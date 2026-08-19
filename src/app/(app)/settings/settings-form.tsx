"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/settings";
import { useTranslations } from "@/contexts/locale-context";
import { CURRENCIES } from "@/lib/currencies";
import { getTimezones, timezoneLabel } from "@/lib/timezones";
import { LOCALE_OPTIONS } from "@/lib/i18n";

type Profile = {
  full_name: string | null;
  business_name: string | null;
  logo_url: string | null;
  phone_number: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_routing: string | null;
  tax_rate: number | null;
  tax_id: string | null;
  default_currency: string | null;
  invoice_prefix: string | null;
  default_invoice_footer: string | null;
  default_invoice_terms: string | null;
  default_due_days: number | null;
  locale: string | null;
  timezone: string | null;
  target_hourly_rate: number | null;
  annual_income_goal: number | null;
};

export function SettingsForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const t = useTranslations();
  const timezones = useMemo(() => {
    const list = getTimezones();
    const current = profile?.timezone;
    if (current && !list.includes(current)) return [current, ...list];
    return list;
  }, [profile?.timezone]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await updateProfile(formData);
    setSaving(false);
    if (result?.error) {
      setMessage(result.error);
    } else {
      setMessage(t("common.saved"));
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <section>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {t("settings.language")}
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {t("settings.timezone")}
          </label>
          <select
            name="timezone"
            defaultValue={profile?.timezone ?? "America/New_York"}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)]"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {timezoneLabel(tz)}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {t("settings.languageLabel")}
          </label>
          <select
            name="locale"
            defaultValue={profile?.locale ?? "en"}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)]"
          >
            {LOCALE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {t("settings.business")}
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.fullName")}
            </label>
            <input
              name="full_name"
              type="text"
              placeholder="Your name"
              defaultValue={profile?.full_name ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.logoUrl")}
            </label>
            <input
              name="logo_url"
              type="url"
              placeholder="https://..."
              defaultValue={profile?.logo_url ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            {profile?.logo_url && (
              <Image
                src={profile.logo_url}
                alt="Logo"
                width={48}
                height={48}
                className="mt-2 h-12 w-auto object-contain"
                unoptimized
              />
            )}
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.businessName")}
            </label>
            <input
              name="business_name"
              type="text"
              placeholder="Your Business Name"
              defaultValue={profile?.business_name ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.phoneNumber")}
            </label>
            <input
              name="phone_number"
              type="tel"
              placeholder="+1 (555) 123-4567"
              defaultValue={profile?.phone_number ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.address")}
            </label>
            <textarea
              name="address"
              rows={3}
              placeholder="Street, City, State, ZIP"
              defaultValue={profile?.address ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {t("settings.bankPayments")}
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.bankName")}
            </label>
            <input
              name="bank_name"
              type="text"
              placeholder="e.g. Chase, Wells Fargo"
              defaultValue={profile?.bank_name ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.accountNumber")}
            </label>
            <input
              name="bank_account"
              type="text"
              placeholder="••••1234"
              maxLength={4}
              defaultValue={profile?.bank_account ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.routingNumber")}
            </label>
            <input
              name="bank_routing"
              type="text"
              placeholder="9 digits"
              defaultValue={profile?.bank_routing ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {t("settings.tax")}
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.taxRate")}
            </label>
            <input
              name="tax_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="0"
              defaultValue={profile?.tax_rate ?? 0}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[13px] text-[var(--text-primary)]"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.taxId")}
            </label>
            <input
              name="tax_id"
              type="text"
              placeholder="EIN or VAT number"
              defaultValue={profile?.tax_id ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          {t("settings.invoiceSettings")}
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.defaultDueDays")}
            </label>
            <input
              name="default_due_days"
              type="number"
              min="1"
              max="365"
              placeholder="30"
              defaultValue={profile?.default_due_days ?? 30}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[13px] text-[var(--text-primary)]"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.defaultFooter")}
            </label>
            <textarea
              name="default_invoice_footer"
              rows={2}
              placeholder="e.g. Thank you for your business"
              defaultValue={profile?.default_invoice_footer ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.defaultTerms")}
            </label>
            <textarea
              name="default_invoice_terms"
              rows={4}
              placeholder="Payment is due within 30 days. Late payments may incur fees."
              defaultValue={profile?.default_invoice_terms ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.defaultCurrency")}
            </label>
            <select
              name="default_currency"
              defaultValue={profile?.default_currency ?? "USD"}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)]"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.invoicePrefix")}
            </label>
            <input
              name="invoice_prefix"
              type="text"
              placeholder="INV-"
              defaultValue={profile?.invoice_prefix ?? "INV-"}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[13px] text-[var(--text-primary)]"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.targetHourlyRate")}
            </label>
            <input
              name="target_hourly_rate"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 150"
              defaultValue={profile?.target_hourly_rate ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">For effective rate comparison</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t("settings.annualIncomeGoal")}
            </label>
            <input
              name="annual_income_goal"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 120000"
              defaultValue={profile?.annual_income_goal ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">Used for projection vs target</p>
          </div>
        </div>
      </section>

      {message && (
        <p className={`text-sm ${message === t("common.saved") ? "text-emerald-400" : "text-red-400"}`}>
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {saving ? t("common.saving") : t("common.saveSettings")}
      </button>
    </form>
  );
}
