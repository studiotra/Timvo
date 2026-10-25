import { describe, expect, it } from "vitest";
import { clientDeleteBlockedMessage, isArchivedClientStatus } from "./lifecycle";

describe("isArchivedClientStatus", () => {
  it("treats missing or active as not archived", () => {
    expect(isArchivedClientStatus(undefined)).toBe(false);
    expect(isArchivedClientStatus(null)).toBe(false);
    expect(isArchivedClientStatus("active")).toBe(false);
  });

  it("detects archived", () => {
    expect(isArchivedClientStatus("archived")).toBe(true);
  });
});

describe("clientDeleteBlockedMessage", () => {
  it("allows delete when there are no invoices or logs", () => {
    expect(clientDeleteBlockedMessage(0, 0)).toBeNull();
  });

  it("blocks delete when invoices or logs exist", () => {
    expect(clientDeleteBlockedMessage(1, 0)).toMatch(/Archive instead/);
    expect(clientDeleteBlockedMessage(0, 2)).toMatch(/Archive instead/);
  });
});
