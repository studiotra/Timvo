import { describe, expect, it } from "vitest";
import {
  formatInvoiceNumber,
  invoiceNumberLabel,
  normalizeInvoicePrefix,
} from "./number";

describe("normalizeInvoicePrefix", () => {
  it("uppercases and defaults", () => {
    expect(normalizeInvoicePrefix(null)).toBe("INV-");
    expect(normalizeInvoicePrefix("inv-")).toBe("INV-");
    expect(normalizeInvoicePrefix("  tm  ")).toBe("TM-");
    expect(normalizeInvoicePrefix("ACME#")).toBe("ACME#");
  });
});

describe("formatInvoiceNumber", () => {
  it("pads sequence and never mixes case", () => {
    expect(formatInvoiceNumber("inv-", 1)).toBe("INV-0001");
    expect(formatInvoiceNumber("INV-", 42)).toBe("INV-0042");
    expect(formatInvoiceNumber("tm-", 12345)).toBe("TM-12345");
  });

  it("returns null without a valid sequence", () => {
    expect(formatInvoiceNumber("INV-", null)).toBeNull();
    expect(formatInvoiceNumber("INV-", 0)).toBeNull();
    expect(formatInvoiceNumber("INV-", -1)).toBeNull();
  });
});

describe("invoiceNumberLabel", () => {
  it("shows em dash when missing", () => {
    expect(invoiceNumberLabel("INV-", null)).toBe("—");
    expect(invoiceNumberLabel("INV-", 7)).toBe("INV-0007");
  });
});
