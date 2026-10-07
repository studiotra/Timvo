import { describe, expect, it } from "vitest";
import { buildWeekDayHours, weekDayBarFractions } from "./week-activity";

const TZ = "America/New_York";

describe("buildWeekDayHours", () => {
  it("buckets minutes into local Mon–Sun hours matching Logs totals", () => {
    // Mon 2026-10-05 13:00 ET = 17:00 UTC
    // Tue 2026-10-06 10:00 ET = 14:00 UTC
    // Wed 2026-10-07 09:00 ET = 13:00 UTC
    const hours = buildWeekDayHours(
      [
        { started_at: "2026-10-05T17:00:00.000Z", duration_minutes: 1086 }, // 18.1h
        { started_at: "2026-10-06T14:00:00.000Z", duration_minutes: 444 }, // 7.4h
        { started_at: "2026-10-07T13:00:00.000Z", duration_minutes: 156 }, // 2.6h
      ],
      TZ
    );
    expect(hours[0]).toBeCloseTo(18.1, 5);
    expect(hours[1]).toBeCloseTo(7.4, 5);
    expect(hours[2]).toBeCloseTo(2.6, 5);
    expect(hours.slice(3)).toEqual([0, 0, 0, 0]);
    expect(hours.reduce((a, b) => a + b, 0)).toBeCloseTo(28.1, 5);
  });

  it("does not use UTC calendar day (evening ET stays on local day)", () => {
    // Mon 2026-10-05 20:30 ET = Tue 00:30 UTC
    const hours = buildWeekDayHours(
      [{ started_at: "2026-10-06T00:30:00.000Z", duration_minutes: 60 }],
      TZ
    );
    expect(hours[0]).toBe(1); // Monday local
    expect(hours[1]).toBe(0); // not Tuesday
  });
});

describe("weekDayBarFractions", () => {
  it("scales bars from absolute hours without an 8h cap", () => {
    const fractions = weekDayBarFractions([18.1, 7.4, 2.6, 0, 0, 0, 0]);
    expect(fractions[0]).toBeCloseTo(1, 5);
    expect(fractions[1]).toBeCloseTo(7.4 / 18.1, 5);
    expect(fractions[2]).toBeCloseTo(2.6 / 18.1, 5);
    // Old UI bug: val * 8 would show Mon as 8.0h instead of 18.1h
    expect(fractions[0] * 8).not.toBeCloseTo(18.1, 1);
  });
});
