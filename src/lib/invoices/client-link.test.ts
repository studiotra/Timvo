import { describe, expect, it } from "vitest";
import {
  canShowPublicPayButton,
  invoiceHasBeenEmailed,
  resolveViewTokenForSend,
} from "./client-link";

describe("invoiceHasBeenEmailed", () => {
  it("is false for drafts (token may exist before first email)", () => {
    expect(invoiceHasBeenEmailed("draft")).toBe(false);
  });

  it("is true once the invoice has left draft via send lifecycle", () => {
    expect(invoiceHasBeenEmailed("sent")).toBe(true);
    expect(invoiceHasBeenEmailed("overdue")).toBe(true);
    expect(invoiceHasBeenEmailed("paid")).toBe(true);
  });
});

describe("canShowPublicPayButton", () => {
  it("hides payment for drafts even if a stale checkout URL exists", () => {
    expect(canShowPublicPayButton("draft", "https://pay.example/x")).toBe(false);
  });

  it("hides payment when paid or when there is no URL", () => {
    expect(canShowPublicPayButton("sent", null)).toBe(false);
    expect(canShowPublicPayButton("paid", "https://pay.example/x")).toBe(false);
  });

  it("shows payment for sent and overdue with a URL", () => {
    expect(canShowPublicPayButton("sent", "https://pay.example/x")).toBe(true);
    expect(canShowPublicPayButton("overdue", "https://pay.example/x")).toBe(true);
  });
});

describe("resolveViewTokenForSend", () => {
  it("keeps an existing token unless regenerateToken is set", () => {
    expect(
      resolveViewTokenForSend({
        existingToken: "keep-me",
        regenerateToken: false,
        createToken: () => "new-token",
      })
    ).toBe("keep-me");
  });

  it("creates a token when missing", () => {
    expect(
      resolveViewTokenForSend({
        existingToken: null,
        regenerateToken: false,
        createToken: () => "new-token",
      })
    ).toBe("new-token");
  });

  it("regenerates when regenerateToken is true", () => {
    expect(
      resolveViewTokenForSend({
        existingToken: "old-token",
        regenerateToken: true,
        createToken: () => "rotated",
      })
    ).toBe("rotated");
  });
});
