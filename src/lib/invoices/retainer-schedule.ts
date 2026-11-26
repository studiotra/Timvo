import { addDaysToDateString, formatDateOnly, localToday, zonedDateTimeToUtc } from "@/lib/dates";

export const INVOICE_CADENCES = ["weekly", "biweekly", "monthly", "bimonthly"] as const;
export type InvoiceCadence = (typeof INVOICE_CADENCES)[number];
export type InvoiceScheduleMode = "auto" | "reminder";

export type RetainerScheduleInput = {
  invoice_schedule_enabled: boolean;
  invoice_cadence: InvoiceCadence | null;
  invoice_anchor_date: string | null;
  invoice_time: string;
  invoice_schedule_mode: InvoiceScheduleMode | null;
  invoice_reminder_days: number | null;
};

export type DueRetainerOccurrence = {
  occurrenceOn: string;
  triggerAt: Date;
  periodLabel: string;
};

const CADENCE_LABEL: Record<InvoiceCadence, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  bimonthly: "Every 2 months",
};

export function isInvoiceCadence(value: string | null | undefined): value is InvoiceCadence {
  return INVOICE_CADENCES.includes(value as InvoiceCadence);
}

export function cadenceLabel(cadence: InvoiceCadence): string {
  return CADENCE_LABEL[cadence];
}

export function normalizeScheduleTime(value: string | null | undefined): string {
  const match = /^(\d{1,2}):(\d{2})/.exec((value ?? "").trim());
  if (!match) return "09:00";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return "09:00";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatScheduleTime(value: string | null | undefined): string {
  const time = normalizeScheduleTime(value);
  const [hourRaw, minute] = time.split(":");
  const hour = Number(hourRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

/** Add calendar months, keeping the anchor day and clamping short months. */
export function addMonthsClamped(dateStr: string, months: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return dateStr;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const total = year * 12 + (month - 1) + months;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(newYear, newMonth, 0)).getUTCDate();
  const newDay = Math.min(day, lastDay);
  return `${newYear}-${String(newMonth).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
}

function daysBetween(start: string, end: string): number {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.round((endMs - startMs) / 86_400_000);
}

function firstIndexNear(anchor: string, cadence: InvoiceCadence, notBefore: string): number {
  if (notBefore <= anchor) return 0;
  if (cadence === "weekly" || cadence === "biweekly") {
    const step = cadence === "weekly" ? 7 : 14;
    return Math.max(0, Math.floor(daysBetween(anchor, notBefore) / step));
  }
  const [anchorYear, anchorMonth] = anchor.split("-").map(Number);
  const [targetYear, targetMonth] = notBefore.split("-").map(Number);
  const months = (targetYear - anchorYear) * 12 + (targetMonth - anchorMonth);
  const step = cadence === "monthly" ? 1 : 2;
  return Math.max(0, Math.floor(months / step) - 1);
}

export function occurrenceOnIndex(anchor: string, cadence: InvoiceCadence, index: number): string {
  if (cadence === "weekly") return addDaysToDateString(anchor, index * 7);
  if (cadence === "biweekly") return addDaysToDateString(anchor, index * 14);
  if (cadence === "monthly") return addMonthsClamped(anchor, index);
  return addMonthsClamped(anchor, index * 2);
}

export function periodForOccurrence(
  anchor: string,
  cadence: InvoiceCadence,
  index: number
): { start: string; end: string; label: string } {
  const start = occurrenceOnIndex(anchor, cadence, index);
  const next = occurrenceOnIndex(anchor, cadence, index + 1);
  const end = addDaysToDateString(next, -1);
  return {
    start,
    end,
    label: `${formatDateOnly(start, { year: "numeric" })} – ${formatDateOnly(end, { year: "numeric" })}`,
  };
}

/**
 * Occurrences whose trigger time has passed, whose invoice day is not before
 * the schedule was saved, and that are still inside the catch-up window.
 * Oldest first. Missed cycles from before the schedule was turned on are skipped.
 */
export function dueRetainerOccurrences(input: {
  anchor: string;
  cadence: InvoiceCadence;
  time: string;
  timezone: string;
  now: Date;
  mode: InvoiceScheduleMode;
  reminderDays: number;
  scheduleUpdatedAt?: string | null;
  lookbackDays?: number;
  limit?: number;
}): DueRetainerOccurrence[] {
  const lookbackDays = input.lookbackDays ?? 70;
  const limit = input.limit ?? 8;
  const today = localToday(input.timezone, input.now);
  const windowStart = addDaysToDateString(today, -lookbackDays);
  const savedOn = input.scheduleUpdatedAt
    ? localToday(input.timezone, new Date(input.scheduleUpdatedAt))
    : input.anchor;
  const notBefore = savedOn > windowStart ? savedOn : windowStart;
  const reminderDays = input.mode === "reminder" ? Math.max(0, input.reminderDays) : 0;
  const results: DueRetainerOccurrence[] = [];
  const startIndex = firstIndexNear(input.anchor, input.cadence, notBefore);

  for (let index = startIndex; index < startIndex + 24 && results.length < limit; index++) {
    const occurrenceOn = occurrenceOnIndex(input.anchor, input.cadence, index);
    const triggerDate =
      reminderDays > 0 ? addDaysToDateString(occurrenceOn, -reminderDays) : occurrenceOn;
    const triggerAt = zonedDateTimeToUtc(triggerDate, normalizeScheduleTime(input.time), input.timezone);
    if (triggerAt.getTime() > input.now.getTime()) break;
    if (occurrenceOn < notBefore) continue;
    results.push({
      occurrenceOn,
      triggerAt,
      periodLabel: periodForOccurrence(input.anchor, input.cadence, index).label,
    });
  }

  return results;
}

export function describeRetainerSchedule(input: {
  enabled?: boolean | null;
  cadence?: string | null;
  anchor?: string | null;
  time?: string | null;
  mode?: string | null;
  reminderDays?: number | null;
}): string | null {
  if (!input.enabled || !isInvoiceCadence(input.cadence) || !input.anchor) return null;
  const when = `${cadenceLabel(input.cadence)} from ${formatDateOnly(input.anchor, { year: "numeric" })} at ${formatScheduleTime(input.time)}`;
  if (input.mode === "auto") return `${when}. Timvo creates the draft invoice.`;
  const days = input.reminderDays ?? 0;
  const before = days === 1 ? "1 day before" : `${days} days before`;
  return `${when}. Reminder ${before}.`;
}

export function parseRetainerScheduleForm(
  formData: FormData
): { skip: true } | { error: string } | { skip: false; value: RetainerScheduleInput } {
  if (formData.get("invoice_schedule_present") !== "1") return { skip: true };

  const enabled = formData.get("invoice_schedule_enabled") === "on";
  const cadenceRaw = String(formData.get("invoice_cadence") ?? "").trim();
  const anchorRaw = String(formData.get("invoice_anchor_date") ?? "").trim();
  const time = normalizeScheduleTime(String(formData.get("invoice_time") ?? ""));
  const modeRaw = String(formData.get("invoice_schedule_mode") ?? "").trim();
  const daysRaw = String(formData.get("invoice_reminder_days") ?? "").trim();
  const cadence = isInvoiceCadence(cadenceRaw) ? cadenceRaw : null;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(anchorRaw) ? anchorRaw : null;
  const mode = modeRaw === "auto" || modeRaw === "reminder" ? modeRaw : null;
  const daysParsed = daysRaw === "" ? null : Number(daysRaw);
  const days =
    daysParsed != null && Number.isInteger(daysParsed) && daysParsed >= 0 && daysParsed <= 60
      ? daysParsed
      : null;

  if (!enabled) {
    return {
      skip: false,
      value: {
        invoice_schedule_enabled: false,
        invoice_cadence: cadence,
        invoice_anchor_date: anchor,
        invoice_time: time,
        invoice_schedule_mode: mode,
        invoice_reminder_days: days,
      },
    };
  }

  if (!cadence) return { error: "Choose how often to invoice this client." };
  if (!anchor) return { error: "Choose the first invoice day." };
  if (!mode) return { error: "Choose whether Timvo creates the invoice or reminds you." };
  if (mode === "reminder" && days == null) {
    return { error: "Set how many days before the invoice day to remind you (0–60)." };
  }

  return {
    skip: false,
    value: {
      invoice_schedule_enabled: true,
      invoice_cadence: cadence,
      invoice_anchor_date: anchor,
      invoice_time: time,
      invoice_schedule_mode: mode,
      invoice_reminder_days: mode === "reminder" ? days : days ?? 3,
    },
  };
}
