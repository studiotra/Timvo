import { describe, expect, it } from "vitest";
import { buildClientSummary, formatCurrencyAmount } from "./summary";

describe("buildClientSummary", () => {
  it("converts minutes to one-decimal hours and rounds money", () => {
    expect(
      buildClientSummary({
        totalMinutes: 90,
        unbilledAmount: 10.005,
        invoiceTotal: 100.999,
        paidInvoiceTotal: 50.1,
      })
    ).toEqual({
      totalHours: 1.5,
      unbilledAmount: 10.01,
      invoiceTotal: 101,
      paidInvoiceTotal: 50.1,
    });
  });
});

describe("formatCurrencyAmount", () => {
  it("formats with the client currency", () => {
    const s = formatCurrencyAmount(1234.5, "USD");
    expect(s).toMatch(/1,234\.50/);
  });
});
