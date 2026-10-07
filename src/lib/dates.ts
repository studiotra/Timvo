/**
 * Timezone-aware date helpers.
 * Prefer the user's Settings timezone; fall back to DEFAULT_TIMEZONE
 * (stable on server and client — avoids React hydration mismatches).
 */

export const DEFAULT_TIMEZONE = "America/New_York";

/**
 * Resolve a usable IANA timezone.
 * Prefer Settings; otherwise a stable default (same on server and client)
 * so date labels do not hydrate-mismatch. Do not use the runtime Intl zone
 * here — that differs between Vercel and the browser.
 */
export function resolveTimezone(preferred?: string | null): string {
  if (preferred && isValidTimezone(preferred)) return preferred;
  return DEFAULT_TIMEZONE;
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function partsToDateString(p: Pick<DateParts, "year" | "month" | "day">): string {
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

function getZonedParts(date: Date, timeZone: string): DateParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  // hourCycle h23 can still yield "24" in some engines for midnight — normalize
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Today's calendar date (YYYY-MM-DD) in the given timezone. */
export function localToday(timeZone: string, now: Date = new Date()): string {
  return partsToDateString(getZonedParts(now, resolveTimezone(timeZone)));
}

/** Format a UTC instant as YYYY-MM-DD in the given timezone. */
export function formatInstantAsLocalDate(
  instant: Date | string,
  timeZone: string
): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(d.getTime())) return "";
  return partsToDateString(getZonedParts(d, resolveTimezone(timeZone)));
}

/** Format a UTC instant as HH:mm in the given timezone. */
export function formatInstantAsLocalTime(
  instant: Date | string,
  timeZone: string
): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(d.getTime())) return "";
  const p = getZonedParts(d, resolveTimezone(timeZone));
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/**
 * Format a stored date-only value (YYYY-MM-DD) for display without UTC shift.
 * Use for invoice issued_at / due_at and similar columns.
 */
export function formatDateOnly(
  dateStr: string | null | undefined,
  options?: { month?: "short" | "long" | "numeric"; day?: "numeric" | "2-digit"; year?: "numeric" | "2-digit" }
): string {
  if (!dateStr) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return dateStr;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  // Noon UTC avoids DST/edge issues when formatting calendar dates
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: options?.month ?? "short",
    day: options?.day ?? "numeric",
    year: options?.year,
  });
}

/** Add days to a YYYY-MM-DD string (calendar arithmetic, no timezone). */
export function addDaysToDateString(dateStr: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/**
 * Convert a local calendar date + wall-clock time in `timeZone` to a UTC Date.
 * `time` is "HH:mm" or "HH:mm:ss".
 */
export function zonedDateTimeToUtc(
  dateStr: string,
  time: string,
  timeZone: string
): Date {
  const tz = resolveTimezone(timeZone);
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!dateMatch) throw new Error(`Invalid date: ${dateStr}`);
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!timeMatch) throw new Error(`Invalid time: ${time}`);

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");

  // Interpret desired local components as if they were UTC, then correct by zone offset.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const asLocal = getZonedParts(new Date(utcGuess), tz);
  const asLocalMs = Date.UTC(
    asLocal.year,
    asLocal.month - 1,
    asLocal.day,
    asLocal.hour,
    asLocal.minute,
    asLocal.second
  );
  let result = utcGuess - (asLocalMs - utcGuess);

  // Second pass handles DST transition edge cases
  const check = getZonedParts(new Date(result), tz);
  const checkMs = Date.UTC(
    check.year,
    check.month - 1,
    check.day,
    check.hour,
    check.minute,
    check.second
  );
  const desiredMs = Date.UTC(year, month - 1, day, hour, minute, second);
  if (checkMs !== desiredMs) {
    result += desiredMs - checkMs;
  }

  return new Date(result);
}

/** Start of local calendar day (00:00:00) as UTC instant. */
export function startOfLocalDay(dateStr: string, timeZone: string): Date {
  return zonedDateTimeToUtc(dateStr, "00:00:00", timeZone);
}

/** End of local calendar day (23:59:59.999) as UTC instant. */
export function endOfLocalDay(dateStr: string, timeZone: string): Date {
  const d = zonedDateTimeToUtc(dateStr, "23:59:59", timeZone);
  d.setUTCMilliseconds(999);
  return d;
}

/**
 * Monday-based week range in the user's timezone.
 * Returns UTC instants covering Mon 00:00:00 through Sun 23:59:59.999 local.
 */
export function getWeekRange(
  timeZone: string,
  offsetWeeks = 0,
  now: Date = new Date()
): { from: Date; to: Date; mondayDate: string; sundayDate: string } {
  const tz = resolveTimezone(timeZone);
  const todayStr = localToday(tz, now);
  // Find Monday of the current local week
  const todayUtcNoon = zonedDateTimeToUtc(todayStr, "12:00:00", tz);
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(todayUtcNoon);
  const weekdayIndex: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const dayIdx = weekdayIndex[weekdayName] ?? 0;
  const mondayStr = addDaysToDateString(todayStr, -dayIdx + offsetWeeks * 7);
  const sundayStr = addDaysToDateString(mondayStr, 6);
  return {
    from: startOfLocalDay(mondayStr, tz),
    to: endOfLocalDay(sundayStr, tz),
    mondayDate: mondayStr,
    sundayDate: sundayStr,
  };
}

/** Month range (1st 00:00 through last day 23:59:59.999) in timezone. */
export function getMonthRange(
  timeZone: string,
  offsetMonths = 0,
  now: Date = new Date()
): { from: Date; to: Date; monthDate: string } {
  const tz = resolveTimezone(timeZone);
  const today = localToday(tz, now);
  const [y, m] = today.split("-").map(Number);
  let year = y;
  let month = m + offsetMonths;
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  const first = `${year}-${pad2(month)}-01`;
  // Last day: day 0 of next month
  const lastDayDate = new Date(Date.UTC(year, month, 0, 12, 0, 0));
  const last = `${year}-${pad2(month)}-${pad2(lastDayDate.getUTCDate())}`;
  return {
    from: startOfLocalDay(first, tz),
    to: endOfLocalDay(last, tz),
    monthDate: first,
  };
}

/**
 * Monday-based day index (Mon=0 … Sun=6) for an instant in the given timezone.
 */
export function localMondayBasedDayIndex(
  instant: Date | string,
  timeZone: string
): number {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimezone(timeZone),
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[weekdayName] ?? 0;
}

/**
 * True when localToday is strictly after dueDate (YYYY-MM-DD).
 * An invoice due today is not overdue.
 */
export function isOverdueByDate(
  dueDate: string | null | undefined,
  timeZone: string,
  now: Date = new Date()
): boolean {
  if (!dueDate) return false;
  const due = dueDate.slice(0, 10);
  const today = localToday(timeZone, now);
  return today > due;
}

/** Format a long "today" label in the given timezone (for shell header). */
export function formatLocalTodayLabel(
  timeZone: string,
  now: Date = new Date()
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimezone(timeZone),
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
    .format(now)
    .toUpperCase();
}

/** Parse "HH:mm" or "HH:mm:ss" to minutes from midnight. */
export function timeStringToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export type LogScheduleResult =
  | { ok: true; startedAt: Date; endedAt: Date; durationMinutes: number; overnight: boolean }
  | { ok: false; error: string };

/**
 * Build started/ended UTC instants for a manual log.
 * When end time is earlier than start (e.g. 23:00–01:00), the end falls on the next local day.
 * Zero-length ranges (same start and end) are rejected.
 */
export function resolveLogSchedule(
  dateStr: string,
  startTime: string,
  endTime: string,
  timeZone: string
): LogScheduleResult {
  const startMins = timeStringToMinutes(startTime);
  const endMins = timeStringToMinutes(endTime);
  if (startMins == null || endMins == null) {
    return { ok: false, error: "Invalid start or end time" };
  }
  if (endMins === startMins) {
    return { ok: false, error: "End time must be after start time" };
  }

  const overnight = endMins < startMins;
  const endDateStr = overnight ? addDaysToDateString(dateStr, 1) : dateStr;

  let startedAt: Date;
  let endedAt: Date;
  try {
    startedAt = zonedDateTimeToUtc(dateStr, startTime, timeZone);
    endedAt = zonedDateTimeToUtc(endDateStr, endTime, timeZone);
  } catch {
    return { ok: false, error: "Invalid date or time" };
  }

  const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
  if (durationMinutes <= 0) {
    return { ok: false, error: "End time must be after start time" };
  }

  return { ok: true, startedAt, endedAt, durationMinutes, overnight };
}

/** Label for project dropdowns when the same name may appear under different clients. */
export function formatProjectOptionLabel(
  projectName: string,
  clientName?: string | null
): string {
  const project = projectName.trim() || "Untitled project";
  const client = clientName?.trim();
  return client ? `${project} · ${client}` : project;
}

/** Prefer description, then task, then project — never a bare "Time" when context exists. */
export function formatLogDisplayTitle(input: {
  description?: string | null;
  taskName?: string | null;
  projectName?: string | null;
}): string {
  const description = input.description?.trim();
  if (description) return description;
  const taskName = input.taskName?.trim();
  if (taskName) return taskName;
  const projectName = input.projectName?.trim();
  if (projectName) return projectName;
  return "Time";
}
