import { localMondayBasedDayIndex } from "@/lib/dates";

export type WeekActivityLog = {
  started_at: string;
  duration_minutes: number | null | undefined;
};

/**
 * Sum duration into Mon–Sun buckets using the user's timezone calendar day.
 * Returns hours per day (same units as the Logs week totals).
 */
export function buildWeekDayHours(
  logs: WeekActivityLog[],
  timeZone: string
): number[] {
  const dayMinutes = [0, 0, 0, 0, 0, 0, 0];
  for (const log of logs) {
    if (!log.started_at) continue;
    const dayIdx = localMondayBasedDayIndex(log.started_at, timeZone);
    dayMinutes[dayIdx] += log.duration_minutes ?? 0;
  }
  return dayMinutes.map((m) => m / 60);
}

/** Bar height fraction 0–1 from absolute hours (relative to the busiest day). */
export function weekDayBarFractions(dayHours: number[]): number[] {
  const max = Math.max(...dayHours, 0);
  if (max <= 0) return dayHours.map(() => 0);
  return dayHours.map((h) => h / max);
}
