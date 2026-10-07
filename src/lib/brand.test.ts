import { describe, expect, it } from "vitest";
import { brandAssetSrc, BRAND_ASPECT } from "./brand";

describe("brandAssetSrc", () => {
  it("uses primary lockup on light and primary-on-ink on dark", () => {
    expect(brandAssetSrc("logo", "light")).toBe("/brand/timvo-logo-primary.svg");
    expect(brandAssetSrc("logo", "dark")).toBe("/brand/timvo-logo-primary-on-ink.svg");
  });

  it("uses purple mark on both surfaces", () => {
    expect(brandAssetSrc("mark", "light")).toBe("/brand/timvo-mark.svg");
    expect(brandAssetSrc("mark", "dark")).toBe("/brand/timvo-mark.svg");
  });

  it("uses ink-aware wordmarks", () => {
    expect(brandAssetSrc("wordmark", "light")).toBe("/brand/timvo-wordmark.svg");
    expect(brandAssetSrc("wordmark", "dark")).toBe("/brand/timvo-wordmark-on-ink.svg");
  });

  it("keeps logo wider than tall", () => {
    expect(BRAND_ASPECT.logo).toBeGreaterThan(3);
    expect(BRAND_ASPECT.mark).toBeGreaterThan(1);
  });
});
