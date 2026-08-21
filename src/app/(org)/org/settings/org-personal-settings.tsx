"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrgPersonalPreferences } from "@/app/actions/settings";
import { getTimezones, timezoneLabel } from "@/lib/timezones";
import { LOCALE_OPTIONS } from "@/lib/i18n";

export function OrgPersonalSettings({
  email,
  role,
  fullName,
  timezone,
  locale,
}: {
  email: string;
  role: string;
  fullName: string | null;
  timezone: string | null;
  locale: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const timezones = useMemo(() => {
    const list = getTimezones();
    if (timezone && !list.includes(timezone)) return [timezone, ...list];
    return list;
  }, [timezone]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const result = await updateOrgPersonalPreferences(new FormData(e.currentTarget));
    setBusy(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Preferences saved");
      router.refresh();
    }
  }

  return (
    <section>
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Your account
      </div>
      <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-[var(--text-secondary)]">Email</span>
          <span className="font-mono text-[12px] text-[var(--text-primary)]">{email}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-[var(--text-secondary)]">Role</span>
          <span className="capitalize text-[13px] text-[var(--text-primary)]">{role}</span>
        </div>

        <form onSubmit={handleSave} className="space-y-3 border-t border-[var(--border)] pt-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Display name
            </label>
            <input
              name="full_name"
              defaultValue={fullName ?? ""}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Timezone
            </label>
            <select
              name="timezone"
              defaultValue={timezone ?? "America/New_York"}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {timezoneLabel(tz)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Language
            </label>
            <select
              name="locale"
              defaultValue={locale ?? "en"}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
            >
              {LOCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--row-hover)] disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save preferences"}
          </button>
        </form>
      </div>
    </section>
  );
}
