import { describe, expect, it } from "vitest";
import {
  addDaysToDateString,
  DEFAULT_TIMEZONE,
  formatInstantAsLocalDate,
  formatInstantAsLocalTime,
  formatLogDisplayTitle,
  formatProjectOptionLabel,
  isOverdueByDate,
  localToday,
  resolveLogSchedule,
  resolveTimezone,
  zonedDateTimeToUtc,
} from "./dates";

const TZ = "America/New_York";

describe("resolveTimezone", () => {
  it("keeps a valid preferred timezone", () => {
    expect(resolveTimezone("America/Toronto")).toBe("America/Toronto");
  });

  it("falls back to a stable default when unset (SSR-safe)", () => {
    expect(resolveTimezone(null)).toBe(DEFAULT_TIMEZONE);
    expect(resolveTimezone(undefined)).toBe(DEFAULT_TIMEZONE);
    expect(resolveTimezone("Not/AZone")).toBe(DEFAULT_TIMEZONE);
  });
});

describe("localToday", () => {
  it("2026-10-06 22:00 Eastern is still 2026-10-06", () => {
    // 22:00 EDT = 02:00 UTC next calendar day
    const now = new Date("2026-10-07T02:00:00.000Z");
    expect(localToday(TZ, now)).toBe("2026-10-06");
  });

  it("2026-10-06 20:00 Eastern is 2026-10-06 (not UTC tomorrow)", () => {
    // 20:00 EDT = 00:00 UTC Oct 7 — classic toISOString().slice bug
    const now = new Date("2026-10-07T00:00:00.000Z");
    expect(localToday(TZ, now)).toBe("2026-10-06");
  });
});

describe("zonedDateTimeToUtc round-trip", () => {
  it("log edited to 2026-10-06, 21:00–22:30 round-trips unchanged", () => {
    const start = zonedDateTimeToUtc("2026-10-06", "21:00", TZ);
    const end = zonedDateTimeToUtc("2026-10-06", "22:30", TZ);

    expect(formatInstantAsLocalDate(start, TZ)).toBe("2026-10-06");
    expect(formatInstantAsLocalTime(start, TZ)).toBe("21:00");
    expect(formatInstantAsLocalDate(end, TZ)).toBe("2026-10-06");
    expect(formatInstantAsLocalTime(end, TZ)).toBe("22:30");

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    expect(durationMinutes).toBe(90);
  });

  it("afternoon slot stays on the same local day", () => {
    const start = zonedDateTimeToUtc("2026-10-06", "13:00", TZ);
    const end = zonedDateTimeToUtc("2026-10-06", "14:00", TZ);
    expect(formatInstantAsLocalDate(start, TZ)).toBe("2026-10-06");
    expect(formatInstantAsLocalTime(start, TZ)).toBe("13:00");
    expect(formatInstantAsLocalTime(end, TZ)).toBe("14:00");
  });
});

describe("isOverdueByDate", () => {
  it("invoice due 2026-10-06 is not overdue at 2026-10-06 23:30 local", () => {
    const now = zonedDateTimeToUtc("2026-10-06", "23:30", TZ);
    expect(isOverdueByDate("2026-10-06", TZ, now)).toBe(false);
  });

  it("invoice due 2026-10-06 is overdue on 2026-10-07", () => {
    const now = zonedDateTimeToUtc("2026-10-07", "00:30", TZ);
    expect(isOverdueByDate("2026-10-06", TZ, now)).toBe(true);
  });
});

describe("addDaysToDateString", () => {
  it("adds calendar days without timezone shift", () => {
    expect(addDaysToDateString("2026-10-06", 30)).toBe("2026-11-05");
  });
});

describe("resolveLogSchedule", () => {
  it("keeps same-day ranges on one local day", () => {
    const result = resolveLogSchedule("2026-10-06", "13:00", "14:00", TZ);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.overnight).toBe(false);
    expect(result.durationMinutes).toBe(60);
    expect(formatInstantAsLocalDate(result.startedAt, TZ)).toBe("2026-10-06");
    expect(formatInstantAsLocalDate(result.endedAt, TZ)).toBe("2026-10-06");
  });

  it("allows overnight 23:00–01:00 ending the next local day", () => {
    const result = resolveLogSchedule("2026-10-06", "23:00", "01:00", TZ);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.overnight).toBe(true);
    expect(result.durationMinutes).toBe(120);
    expect(formatInstantAsLocalDate(result.startedAt, TZ)).toBe("2026-10-06");
    expect(formatInstantAsLocalTime(result.startedAt, TZ)).toBe("23:00");
    expect(formatInstantAsLocalDate(result.endedAt, TZ)).toBe("2026-10-07");
    expect(formatInstantAsLocalTime(result.endedAt, TZ)).toBe("01:00");
  });

  it("rejects zero-length logs", () => {
    const result = resolveLogSchedule("2026-10-06", "09:00", "09:00", TZ);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/after start/i);
  });
});

describe("formatProjectOptionLabel", () => {
  it("appends client name when present", () => {
    expect(formatProjectOptionLabel("Branding", "Space Creatorz")).toBe(
      "Branding · Space Creatorz"
    );
  });

  it("falls back to project name alone", () => {
    expect(formatProjectOptionLabel("Branding")).toBe("Branding");
  });
});

describe("formatLogDisplayTitle", () => {
  it("prefers description, then task, then project", () => {
    expect(
      formatLogDisplayTitle({
        description: "Logo concepts",
        taskName: "Design",
        projectName: "Branding",
      })
    ).toBe("Logo concepts");
    expect(
      formatLogDisplayTitle({
        description: "  ",
        taskName: "Design",
        projectName: "Branding",
      })
    ).toBe("Design");
    expect(
      formatLogDisplayTitle({
        description: null,
        taskName: null,
        projectName: "Branding",
      })
    ).toBe("Branding");
  });
});
