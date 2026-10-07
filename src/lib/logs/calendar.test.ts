import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  dayLogVisibility,
  formatDayDuration,
  mondayIndexForDateKey,
  MONTH_VISIBLE_LOGS,
  WEEK_VISIBLE_LOGS,
} from "./calendar";

describe("dayLogVisibility", () => {
  it("shows all when under the limit", () => {
    expect(dayLogVisibility(3, WEEK_VISIBLE_LOGS)).toEqual({
      visibleCount: 3,
      overflowCount: 0,
    });
  });

  it("splits overflow above the week limit", () => {
    expect(dayLogVisibility(9, WEEK_VISIBLE_LOGS)).toEqual({
      visibleCount: 6,
      overflowCount: 3,
    });
  });

  it("splits overflow above the month limit", () => {
    expect(dayLogVisibility(5, MONTH_VISIBLE_LOGS)).toEqual({
      visibleCount: 3,
      overflowCount: 2,
    });
  });
});

describe("formatDayDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDayDuration(125)).toBe("2h 5m");
    expect(formatDayDuration(60)).toBe("1h 0m");
    expect(formatDayDuration(0)).toBe("0h 0m");
  });
});

describe("mondayIndexForDateKey", () => {
  it("maps Monday to 0 and Sunday to 6", () => {
    expect(mondayIndexForDateKey("2026-03-02")).toBe(0); // Mon
    expect(mondayIndexForDateKey("2026-03-01")).toBe(6); // Sun
  });
});

describe("buildMonthGrid", () => {
  it("starts on Monday when the month starts on Monday", () => {
    // June 2026 starts on Monday
    const weeks = buildMonthGrid("2026-06-01", "2026-06-15");
    expect(weeks[0][0]).toMatchObject({
      dateKey: "2026-06-01",
      inMonth: true,
      dayNum: 1,
    });
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("pads leading days when the month starts on Sunday", () => {
    // March 2026 starts on Sunday → leading Mon–Sat from Feb
    const weeks = buildMonthGrid("2026-03-01", "2026-03-10");
    expect(weeks[0].map((d) => d.dateKey)).toEqual([
      "2026-02-23",
      "2026-02-24",
      "2026-02-25",
      "2026-02-26",
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks[0][6].inMonth).toBe(true);
  });

  it("uses 6 rows when needed", () => {
    // March 2026 starts Sunday → 6 leading pads + 31 days → 6 weeks
    const weeks = buildMonthGrid("2026-03-01", "2026-03-01");
    expect(weeks.length).toBe(6);
    expect(weeks[5][6].dateKey >= "2026-03-31").toBe(true);
  });

  it("covers Feb 29 in a leap year", () => {
    const weeks = buildMonthGrid("2024-02-01", "2024-02-29");
    const keys = weeks.flat().map((d) => d.dateKey);
    expect(keys).toContain("2024-02-29");
    const leap = weeks.flat().find((d) => d.dateKey === "2024-02-29");
    expect(leap).toMatchObject({ inMonth: true, isToday: true, dayNum: 29 });
  });

  it("keeps contiguous date keys across DST spring-forward (America/Toronto March)", () => {
    // DST starts 2026-03-08 in America/Toronto; grid is calendar keys only
    const weeks = buildMonthGrid("2026-03-01", "2026-03-08");
    const keys = weeks.flat().map((d) => d.dateKey);
    for (let i = 1; i < keys.length; i++) {
      const prev = new Date(keys[i - 1] + "T12:00:00.000Z");
      const next = new Date(keys[i] + "T12:00:00.000Z");
      expect((next.getTime() - prev.getTime()) / 86400000).toBe(1);
    }
    expect(keys).toContain("2026-03-08");
    expect(keys).toContain("2026-03-09");
  });

  it("keeps contiguous date keys across DST fall-back (America/Toronto November)", () => {
    // DST ends 2026-11-01 in America/Toronto
    const weeks = buildMonthGrid("2026-11-01", "2026-11-01");
    const keys = weeks.flat().map((d) => d.dateKey);
    for (let i = 1; i < keys.length; i++) {
      const prev = new Date(keys[i - 1] + "T12:00:00.000Z");
      const next = new Date(keys[i] + "T12:00:00.000Z");
      expect((next.getTime() - prev.getTime()) / 86400000).toBe(1);
    }
    expect(keys.filter((k) => k.startsWith("2026-11")).length).toBe(30);
  });
});
