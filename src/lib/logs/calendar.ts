import { addDaysToDateString } from "@/lib/dates";

/** Visible log chips in week calendar cells (cell height sized to fit these). */
export const WEEK_VISIBLE_LOGS = 6;

/** Visible log chips in month calendar cells on wider screens. */
export const MONTH_VISIBLE_LOGS = 3;

export type MonthDayCell = {
  dateKey: string;
  inMonth: boolean;
  isToday: boolean;
  dayNum: number;
};

/** Monday-based weekday index (Mon=0 … Sun=6) for a calendar date key. */
export function mondayIndexForDateKey(dateKey: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return 0;
  const utcNoon = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  );
  return (utcNoon.getUTCDay() + 6) % 7;
}

/**
 * Build a Monday-start month grid of weeks.
 * `monthStart` is the first of the month (YYYY-MM-DD); days outside the month
 * are included as padding so each week has 7 contiguous date keys.
 */
export function buildMonthGrid(
  monthStart: string,
  todayKey: string
): MonthDayCell[][] {
  const m = /^(\d{4})-(\d{2})-01$/.exec(monthStart);
  if (!m) return [];

  const year = Number(m[1]);
  const month = Number(m[2]);
  const lastDayNum = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
  const monthEnd = `${m[1]}-${m[2]}-${String(lastDayNum).padStart(2, "0")}`;

  const lead = mondayIndexForDateKey(monthStart);
  let cursor = addDaysToDateString(monthStart, -lead);
  const weeks: MonthDayCell[][] = [];

  while (true) {
    const week: MonthDayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const dayNum = Number(cursor.slice(8, 10));
      const inMonth =
        cursor >= monthStart && cursor <= monthEnd;
      week.push({
        dateKey: cursor,
        inMonth,
        isToday: cursor === todayKey,
        dayNum,
      });
      cursor = addDaysToDateString(cursor, 1);
    }
    weeks.push(week);
    if (week[6].dateKey >= monthEnd) break;
  }

  return weeks;
}

/** How many chips to show vs overflow count for a day's logs. */
export function dayLogVisibility(
  totalLogs: number,
  visibleLimit: number
): { visibleCount: number; overflowCount: number } {
  const limit = Math.max(0, visibleLimit);
  if (totalLogs <= limit) {
    return { visibleCount: totalLogs, overflowCount: 0 };
  }
  return { visibleCount: limit, overflowCount: totalLogs - limit };
}

/** Format minutes as "Xh Ym" for day totals. */
export function formatDayDuration(mins: number): string {
  const safe = Math.max(0, Math.round(mins));
  return `${Math.floor(safe / 60)}h ${safe % 60}m`;
}
