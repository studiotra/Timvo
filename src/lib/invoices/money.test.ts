import { describe, expect, it } from "vitest";
import {
  computeInvoiceMoney,
  computeTaxAmount,
  isZeroMoneyTotal,
  lineAmount,
  parseTaxRateInput,
  resolveDisplayMoney,
  resolveTaxRate,
  roundCents,
} from "./money";

describe("roundCents", () => {
  it("rounds half away from zero to nearest cent", () => {
    expect(roundCents(333.335)).toBe(333.34);
    expect(roundCents(1.005)).toBe(1.01);
    expect(roundCents(-50.005)).toBe(-50.01);
  });
});

describe("lineAmount", () => {
  it("rounds qty × rate per line", () => {
    expect(lineAmount(1.5, 222.22)).toBe(333.33);
    expect(lineAmount(1.5, 300)).toBe(450);
    expect(lineAmount(1, -50)).toBe(-50);
  });
});

describe("resolveTaxRate", () => {
  it("prefers project tax over profile", () => {
    expect(resolveTaxRate(13, 5)).toBe(13);
    expect(resolveTaxRate(null, 13)).toBe(13);
    expect(resolveTaxRate(0, 13)).toBe(13);
    expect(resolveTaxRate(null, 0)).toBeNull();
  });
});

describe("computeTaxAmount / computeInvoiceMoney", () => {
  it("includes tax in total", () => {
    const money = computeInvoiceMoney(
      [
        { quantity: 1.5, unit_rate: 222.22, amount: 333.33 },
        { quantity: 1, unit_rate: -50, amount: -50 },
      ],
      13
    );
    expect(money.subtotal).toBe(283.33);
    expect(money.taxAmount).toBe(36.83);
    expect(money.total).toBe(320.16);
  });

  it("Live Total style: sum of qty × rate with per-line rounding", () => {
    const money = computeInvoiceMoney(
      [
        { quantity: 1.5, unit_rate: 300 },
        { quantity: 1, unit_rate: -50 },
      ],
      null,
      { recomputeFromQtyRate: true }
    );
    expect(money.subtotal).toBe(400);
    expect(money.taxAmount).toBe(0);
    expect(money.total).toBe(400);
  });

  it("recompute ignores mismatched amount field", () => {
    const money = computeInvoiceMoney(
      [{ quantity: 2, unit_rate: 100, amount: 999 }],
      10,
      { recomputeFromQtyRate: true }
    );
    expect(money.subtotal).toBe(200);
    expect(money.taxAmount).toBe(20);
    expect(money.total).toBe(220);
  });

  it("computeTaxAmount matches helper", () => {
    expect(computeTaxAmount(423.34, 13)).toBe(55.03);
  });
});

describe("resolveDisplayMoney", () => {
  const lines = [{ amount: 423.34 }];

  it("uses settings tax when stored total matches", () => {
    const money = resolveDisplayMoney(lines, 478.37, 13);
    expect(money.subtotal).toBe(423.34);
    expect(money.taxAmount).toBe(55.03);
    expect(money.total).toBe(478.37);
  });

  it("upgrades legacy pre-tax stored total with settings tax", () => {
    const money = resolveDisplayMoney(lines, 423.34, 13);
    expect(money.subtotal).toBe(423.34);
    expect(money.taxAmount).toBe(55.03);
    expect(money.total).toBe(478.37);
  });

  it("derives tax from a custom stored total", () => {
    const money = resolveDisplayMoney(lines, 450, 13);
    expect(money.subtotal).toBe(423.34);
    expect(money.taxAmount).toBe(26.66);
    expect(money.total).toBe(450);
  });
});

describe("isZeroMoneyTotal", () => {
  it("treats near-zero as zero; null/undefined are unknown", () => {
    expect(isZeroMoneyTotal(0)).toBe(true);
    expect(isZeroMoneyTotal(0.001)).toBe(true);
    expect(isZeroMoneyTotal(1)).toBe(false);
    expect(isZeroMoneyTotal(null)).toBe(false);
    expect(isZeroMoneyTotal(undefined)).toBe(false);
  });
});

describe("parseTaxRateInput", () => {
  it("parses form tax values", () => {
    expect(parseTaxRateInput("13")).toBe(13);
    expect(parseTaxRateInput("0")).toBeNull();
    expect(parseTaxRateInput("")).toBeNull();
    expect(parseTaxRateInput("-5")).toBeNull();
  });
});
