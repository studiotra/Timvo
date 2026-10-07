/** Paths under `/public/brand` for Timvo product artwork (not business logos). */

export const BRAND_DIR = "/brand";

/** Intrinsic aspect ratios from Final-Logo SVGs (width / height). */
export const BRAND_ASPECT = {
  logo: 433.59 / 116.31,
  mark: 156.5 / 145.5,
  wordmark: 326.2 / 116.31,
} as const;

export type BrandVariant = keyof typeof BRAND_ASPECT;
export type BrandSurface = "light" | "dark";

export function brandAssetSrc(variant: BrandVariant, surface: BrandSurface): string {
  if (variant === "logo") {
    return surface === "dark"
      ? `${BRAND_DIR}/timvo-logo-primary-on-ink.svg`
      : `${BRAND_DIR}/timvo-logo-primary.svg`;
  }
  if (variant === "mark") {
    // Funnel V purple reads on both light and dark chrome.
    return `${BRAND_DIR}/timvo-mark.svg`;
  }
  return surface === "dark"
    ? `${BRAND_DIR}/timvo-wordmark-on-ink.svg`
    : `${BRAND_DIR}/timvo-wordmark.svg`;
}
