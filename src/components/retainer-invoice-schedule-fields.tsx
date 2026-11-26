"use client";

import { useState } from "react";
import { INVOICE_CADENCES, cadenceLabel, normalizeScheduleTime } from "@/lib/invoices/retainer-schedule";

export type RetainerScheduleFormValues = {
  invoice_schedule_enabled?: boolean | null;
  invoice_cadence?: string | null;
  invoice_anchor_date?: string | null;
  invoice_time?: string | null;
  invoice_schedule_mode?: string | null;
  invoice_reminder_days?: number | null;
};

export function RetainerInvoiceScheduleFields({
  client,
}: {
  client?: RetainerScheduleFormValues | null;
}) {
  const [enabled, setEnabled] = useState(Boolean(client?.invoice_schedule_enabled));
  const [mode, setMode] = useState(client?.invoice_schedule_mode === "auto" ? "auto" : "reminder");
  const [days, setDays] = useState(
    client?.invoice_reminder_days != null ? String(client.invoice_reminder_days) : "3"
  );
  const cadence = INVOICE_CADENCES.includes(client?.invoice_cadence as (typeof INVOICE_CADENCES)[number])
    ? client?.invoice_cadence
    : "monthly";
  const anchor = client?.invoice_anchor_date?.slice(0, 10) ?? "";
  const time = normalizeScheduleTime(client?.invoice_time ?? "09:00");

  return (
    <fieldset className="space-y-3 rounded-xl border border-[var(--border)] p-3">
      <legend className="px-1 text-sm font-semibold text-[var(--text-primary)]">
        Retainer invoicing
      </legend>
      <input type="hidden" name="invoice_schedule_present" value="1" />
      <label className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          name="invoice_schedule_enabled"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="mt-0.5"
        />
        <span>Invoice this client on a schedule</span>
      </label>
      <p className="text-xs text-[var(--text-muted)]">
        Uses the retainer amount on each active project. The time follows the timezone in Settings.
      </p>

      <div className={enabled ? "space-y-3" : "hidden"}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
            How often
          </label>
          <select
            name="invoice_cadence"
            defaultValue={cadence ?? "monthly"}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)]"
          >
            {INVOICE_CADENCES.map((value) => (
              <option key={value} value={value}>
                {cadenceLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              First invoice day
            </label>
            <input
              type="date"
              name="invoice_anchor_date"
              defaultValue={anchor}
              required={enabled}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Time
            </label>
            <input
              type="time"
              name="invoice_time"
              defaultValue={time}
              required={enabled}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)]"
            />
          </div>
        </div>
        <div className="space-y-2 text-sm text-[var(--text-secondary)]">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="invoice_schedule_mode"
              value="auto"
              checked={mode === "auto"}
              onChange={() => setMode("auto")}
              className="mt-0.5"
            />
            <span>Timvo creates a draft invoice. You’ll see a reminder the next time you sign in.</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="invoice_schedule_mode"
              value="reminder"
              checked={mode === "reminder"}
              onChange={() => setMode("reminder")}
              className="mt-0.5"
            />
            <span className="flex flex-wrap items-center gap-2">
              Remind me
              <input
                type="number"
                min={0}
                max={60}
                name="invoice_reminder_days"
                value={days}
                onChange={(event) => setDays(event.target.value)}
                disabled={mode !== "reminder"}
                className="w-16 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1 text-[var(--text-primary)] disabled:opacity-50"
              />
              days before to create the invoice
            </span>
          </label>
        </div>
      </div>

      {!enabled && (
        <>
          <input type="hidden" name="invoice_cadence" value={cadence ?? ""} />
          <input type="hidden" name="invoice_anchor_date" value={anchor} />
          <input type="hidden" name="invoice_time" value={time} />
          <input type="hidden" name="invoice_schedule_mode" value={mode} />
          <input type="hidden" name="invoice_reminder_days" value={days} />
        </>
      )}
      {enabled && mode === "auto" && (
        <input type="hidden" name="invoice_reminder_days" value={days || "3"} />
      )}
    </fieldset>
  );
}
