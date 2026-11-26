import { describe, expect, it } from "vitest";
import {
  addMonthsClamped,
  dueRetainerOccurrences,
  occurrenceOnIndex,
  parseRetainerScheduleForm,
  periodForOccurrence,
} from "./retainer-schedule";

describe("addMonthsClamped", () => {
  it("keeps the anchor day and clamps short months", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2026-01-31", 2)).toBe("2026-03-31");
    expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29");
  });
});

describe("occurrenceOnIndex", () => {
  it("steps weekly, biweekly, monthly, and every two months from the anchor", () => {
    expect(occurrenceOnIndex("2026-03-04", "weekly", 2)).toBe("2026-03-18");
    expect(occurrenceOnIndex("2026-03-04", "biweekly", 2)).toBe("2026-04-01");
    expect(occurrenceOnIndex("2026-01-31", "monthly", 1)).toBe("2026-02-28");
    expect(occurrenceOnIndex("2026-01-15", "bimonthly", 1)).toBe("2026-03-15");
  });
});

describe("periodForOccurrence", () => {
  it("covers the days until the next invoice day", () => {
    const period = periodForOccurrence("2026-03-01", "monthly", 0);
    expect(period.start).toBe("2026-03-01");
    expect(period.end).toBe("2026-03-31");
  });
});

describe("dueRetainerOccurrences", () => {
  const timezone = "America/New_York";

  it("includes an auto invoice once the set time has passed", () => {
    const due = dueRetainerOccurrences({
      anchor: "2026-03-01",
      cadence: "monthly",
      time: "09:00",
      timezone,
      now: new Date("2026-03-01T15:00:00.000Z"),
      mode: "auto",
      reminderDays: 0,
      scheduleUpdatedAt: "2026-02-01T12:00:00.000Z",
    });
    expect(due.map((row) => row.occurrenceOn)).toEqual(["2026-03-01"]);
  });

  it("waits until the set time", () => {
    const due = dueRetainerOccurrences({
      anchor: "2026-03-01",
      cadence: "monthly",
      time: "11:00",
      timezone,
      now: new Date("2026-03-01T15:00:00.000Z"),
      mode: "auto",
      reminderDays: 0,
      scheduleUpdatedAt: "2026-02-01T12:00:00.000Z",
    });
    expect(due).toEqual([]);
  });

  it("opens a reminder the chosen number of days before the invoice day", () => {
    const due = dueRetainerOccurrences({
      anchor: "2026-03-04",
      cadence: "weekly",
      time: "09:00",
      timezone,
      now: new Date("2026-03-01T15:00:00.000Z"),
      mode: "reminder",
      reminderDays: 3,
      scheduleUpdatedAt: "2026-02-01T12:00:00.000Z",
    });
    expect(due.map((row) => row.occurrenceOn)).toEqual(["2026-03-04"]);
  });

  it("still finds the current cycle when the first invoice day was years ago", () => {
    const due = dueRetainerOccurrences({
      anchor: "2020-01-01",
      cadence: "weekly",
      time: "09:00",
      timezone,
      now: new Date("2026-03-04T15:00:00.000Z"),
      mode: "auto",
      reminderDays: 0,
      scheduleUpdatedAt: "2026-03-01T12:00:00.000Z",
    });
    expect(due.map((row) => row.occurrenceOn)).toContain("2026-03-04");
  });

  it("does not backfill cycles from before the schedule was saved", () => {
    const due = dueRetainerOccurrences({
      anchor: "2026-01-01",
      cadence: "monthly",
      time: "09:00",
      timezone,
      now: new Date("2026-04-02T15:00:00.000Z"),
      mode: "auto",
      reminderDays: 0,
      scheduleUpdatedAt: "2026-04-01T12:00:00.000Z",
    });
    expect(due.map((row) => row.occurrenceOn)).toEqual(["2026-04-01"]);
  });
});

describe("parseRetainerScheduleForm", () => {
  it("skips when the schedule section is not on the form", () => {
    expect(parseRetainerScheduleForm(new FormData())).toEqual({ skip: true });
  });

  it("requires a day and a mode when the schedule is on", () => {
    const form = new FormData();
    form.set("invoice_schedule_present", "1");
    form.set("invoice_schedule_enabled", "on");
    form.set("invoice_cadence", "monthly");
    expect(parseRetainerScheduleForm(form)).toEqual({ error: "Choose the first invoice day." });
  });

  it("accepts an automatic monthly schedule", () => {
    const form = new FormData();
    form.set("invoice_schedule_present", "1");
    form.set("invoice_schedule_enabled", "on");
    form.set("invoice_cadence", "monthly");
    form.set("invoice_anchor_date", "2026-03-01");
    form.set("invoice_time", "09:30");
    form.set("invoice_schedule_mode", "auto");
    expect(parseRetainerScheduleForm(form)).toMatchObject({
      skip: false,
      value: {
        invoice_schedule_enabled: true,
        invoice_cadence: "monthly",
        invoice_anchor_date: "2026-03-01",
        invoice_time: "09:30",
        invoice_schedule_mode: "auto",
      },
    });
  });
});
