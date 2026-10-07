import { describe, expect, it } from "vitest";
import {
  addDaysToDateString,
  formatInstantAsLocalDate,
  formatInstantAsLocalTime,
  isOverdueByDate,
  localToday,
  zonedDateTimeToUtc,
} from "./dates";

const TZ = "America/New_York";

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
