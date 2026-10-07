import { describe, expect, it } from "vitest";
import { resolveInvoiceDisplayStatus } from "./status";

const TZ = "America/New_York";

describe("resolveInvoiceDisplayStatus", () => {
  it("marks past-due sent invoices overdue", () => {
    const now = new Date("2026-10-07T16:00:00.000Z");
    expect(
      resolveInvoiceDisplayStatus(
        { status: "sent", due_at: "2026-10-01", total_amount: 100 },
        TZ,
        now
      )
    ).toBe("overdue");
  });

  it("never shows $0 invoices as overdue", () => {
    const now = new Date("2026-10-07T16:00:00.000Z");
    expect(
      resolveInvoiceDisplayStatus(
        { status: "sent", due_at: "2026-10-01", total_amount: 0 },
        TZ,
        now
      )
    ).toBe("sent");
    expect(
      resolveInvoiceDisplayStatus(
        { status: "overdue", due_at: "2026-10-01", total_amount: 0 },
        TZ,
        now
      )
    ).toBe("sent");
  });

  it("maps DB overdue $0 invoices to sent (Dashboard and list must match)", () => {
    expect(
      resolveInvoiceDisplayStatus(
        { status: "overdue", due_at: "2026-08-01", total_amount: 0.0 },
        TZ,
        new Date("2026-10-07T16:00:00.000Z")
      )
    ).toBe("sent");
  });

  it("keeps paid as paid even when past due", () => {
    expect(
      resolveInvoiceDisplayStatus(
        { status: "paid", due_at: "2026-01-01", total_amount: 50 },
        TZ
      )
    ).toBe("paid");
  });
});
