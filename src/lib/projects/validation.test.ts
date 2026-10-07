import { describe, expect, it } from "vitest";
import {
  ESTIMATED_HOURS_MAX,
  friendlyDbError,
  isDuplicateProjectName,
  parseEstimatedHours,
  parseHourlyRate,
  parseMoneyField,
} from "./validation";

describe("parseEstimatedHours", () => {
  it("accepts empty as null", () => {
    expect(parseEstimatedHours("")).toEqual({ ok: true, value: null });
    expect(parseEstimatedHours("  ")).toEqual({ ok: true, value: null });
  });

  it("accepts sensible values", () => {
    expect(parseEstimatedHours("20")).toEqual({ ok: true, value: 20 });
    expect(parseEstimatedHours("0.5")).toEqual({ ok: true, value: 0.5 });
    expect(parseEstimatedHours(String(ESTIMATED_HOURS_MAX))).toEqual({
      ok: true,
      value: ESTIMATED_HOURS_MAX,
    });
  });

  it("rejects overflow and negatives", () => {
    const big = parseEstimatedHours("99999999999");
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error).toMatch(/or less/i);

    const neg = parseEstimatedHours("-1");
    expect(neg.ok).toBe(false);
  });
});

describe("parseHourlyRate / parseMoneyField", () => {
  it("parses optional money", () => {
    expect(parseHourlyRate("60")).toEqual({ ok: true, value: 60 });
    expect(parseMoneyField("", "Agreed fee")).toEqual({ ok: true, value: null });
  });
});

describe("friendlyDbError", () => {
  it("hides numeric overflow", () => {
    expect(friendlyDbError("numeric field overflow")).toMatch(/too large/i);
    expect(friendlyDbError("other failure")).toBe("other failure");
  });
});

describe("isDuplicateProjectName", () => {
  it("detects case-insensitive duplicates within a client", () => {
    expect(
      isDuplicateProjectName("Branding", ["Website", "branding"])
    ).toBe(true);
    expect(
      isDuplicateProjectName("Branding", ["Website"], {
        excludeName: "Branding",
      })
    ).toBe(false);
  });
});
