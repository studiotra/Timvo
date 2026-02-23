"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/settings";

type Profile = {
  business_name: string | null;
  logo_url: string | null;
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
};

export function SettingsForm({ profile }: { profile: Profile | null }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage("Saved!");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <section>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Business
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Logo URL
            </label>
            <input
              name="logo_url"
              type="url"
              placeholder="https://..."
              defaultValue={profile?.logo_url ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            {profile?.logo_url && (
              <img
                src={profile.logo_url}
                alt="Logo"
                className="mt-2 h-12 object-contain"
              />
            )}
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Business Name
            </label>
            <input
              name="business_name"
              type="text"
              placeholder="Your Business Name"
              defaultValue={profile?.business_name ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Bank & Payments
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Bank Name
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
              Account Number (last 4)
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
              Routing Number
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
          Tax
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Tax Rate (%)
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
              Tax ID
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
          Invoice Settings
        </div>
        <div className="space-y-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Default Due Date (days from issue)
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
              Default Footer
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
              Default Terms & Conditions
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
              Default Currency
            </label>
            <select
              name="default_currency"
              defaultValue={profile?.default_currency ?? "USD"}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[13px] text-[var(--text-primary)]"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Invoice Prefix
            </label>
            <input
              name="invoice_prefix"
              type="text"
              placeholder="INV-"
              defaultValue={profile?.invoice_prefix ?? "INV-"}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-[13px] text-[var(--text-primary)]"
            />
          </div>
        </div>
      </section>

      {message && (
        <p className={`text-sm ${message === "Saved!" ? "text-emerald-400" : "text-red-400"}`}>
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
