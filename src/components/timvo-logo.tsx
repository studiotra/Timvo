import { cn } from "@/lib/utils";
import {
  BRAND_ASPECT,
  brandAssetSrc,
  type BrandSurface,
  type BrandVariant,
} from "@/lib/brand";

type TimvoLogoProps = {
  /** Full lockup, mark only, or wordmark only. */
  variant?: BrandVariant;
  /**
   * Which artwork set to use.
   * - auto: primary on light theme, primary-on-ink on dark (via `.dark`)
   * - light / dark: force that surface’s assets
   */
  surface?: "auto" | BrandSurface;
  /** Rendered height in px; width follows aspect ratio. */
  height?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Timvo product logo. Prefer this over text “Timvo” / letter-T marks in chrome.
 * Business logos (Settings logo_url on invoices) stay separate.
 */
export function TimvoLogo({
  variant = "logo",
  surface = "auto",
  height = 28,
  className,
  priority = false,
}: TimvoLogoProps) {
  const width = Math.round(height * BRAND_ASPECT[variant]);
  const style = { height, width };
  const fetchPriority = priority ? { fetchPriority: "high" as const } : {};

  if (surface === "auto") {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center", className)}
        style={{ height, width }}
        role="img"
        aria-label="Timvo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brandAssetSrc(variant, "light")}
          alt=""
          width={width}
          height={height}
          className="block h-full w-full dark:hidden"
          decoding="async"
          {...fetchPriority}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brandAssetSrc(variant, "dark")}
          alt=""
          width={width}
          height={height}
          className="hidden h-full w-full dark:block"
          decoding="async"
          {...fetchPriority}
        />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brandAssetSrc(variant, surface)}
      alt="Timvo"
      width={width}
      height={height}
      className={cn("inline-block shrink-0", className)}
      style={style}
      decoding="async"
      {...fetchPriority}
    />
  );
}
