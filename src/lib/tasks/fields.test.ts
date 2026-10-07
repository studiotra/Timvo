import { describe, expect, it } from "vitest";
import {
  buildSortOrderUpdates,
  isMissingColumnError,
  normalizeDueDate,
  sortTaskRows,
} from "./fields";

describe("normalizeDueDate", () => {
  it("accepts empty as null", () => {
    expect(normalizeDueDate("")).toEqual({ ok: true, dueDate: null });
    expect(normalizeDueDate(null)).toEqual({ ok: true, dueDate: null });
  });

  it("accepts a valid calendar day", () => {
    expect(normalizeDueDate("2026-10-06")).toEqual({
      ok: true,
      dueDate: "2026-10-06",
    });
  });

  it("rejects invalid shapes and impossible days", () => {
    expect(normalizeDueDate("10/06/2026").ok).toBe(false);
    expect(normalizeDueDate("2026-02-30").ok).toBe(false);
  });
});

describe("sortTaskRows", () => {
  it("orders by sort_order, then puts done after open, derived last", () => {
    const rows = sortTaskRows([
      { id: "a", name: "Zebra", sortOrder: 2, isDone: false },
      { id: null, name: "Derived", sortOrder: 0 },
      { id: "b", name: "Alpha", sortOrder: 0, isDone: true },
      { id: "c", name: "Beta", sortOrder: 1, isDone: false },
    ]);
    expect(rows.map((r) => r.id)).toEqual(["c", "a", "b", null]);
  });
});

describe("buildSortOrderUpdates", () => {
  it("assigns contiguous indices", () => {
    expect(buildSortOrderUpdates(["x", "y", "z"])).toEqual([
      { id: "x", sortOrder: 0 },
      { id: "y", sortOrder: 1 },
      { id: "z", sortOrder: 2 },
    ]);
  });
});

describe("isMissingColumnError", () => {
  it("detects common PostgREST missing-column messages", () => {
    expect(isMissingColumnError('column "is_done" does not exist')).toBe(true);
    expect(isMissingColumnError("Could not find the 'due_date' column")).toBe(
      true
    );
    expect(isMissingColumnError("foreign key violation")).toBe(false);
  });
});
