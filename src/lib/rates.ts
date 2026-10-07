/**
 * Resolve billable hourly rates: project → service → settings/client default.
 * Used by Dashboard, invoice creation, and project rate labels.
 */

export type RateSource = "project" | "service" | "default" | "none";

export type ResolvedRate = {
  rate: number;
  source: RateSource;
  /** True when a billable hourly line would charge $0 because no rate exists. */
  missing: boolean;
};

/**
 * Prefer an explicit project rate, then the linked service rate,
 * then any Settings/client default the app provides.
 */
export function resolveHourlyRate(options: {
  projectRate?: number | null;
  serviceRate?: number | null;
  defaultRate?: number | null;
}): ResolvedRate {
  const project = toPositiveRate(options.projectRate);
  if (project != null) {
    return { rate: project, source: "project", missing: false };
  }
  const service = toPositiveRate(options.serviceRate);
  if (service != null) {
    return { rate: service, source: "service", missing: false };
  }
  const fallback = toPositiveRate(options.defaultRate);
  if (fallback != null) {
    return { rate: fallback, source: "default", missing: false };
  }
  return { rate: 0, source: "none", missing: true };
}

function toPositiveRate(value: number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Short label for UI (project cards, invoice rows). */
export function rateSourceLabel(source: RateSource): string {
  switch (source) {
    case "project":
      return "project rate";
    case "service":
      return "service rate";
    case "default":
      return "default rate";
    default:
      return "no rate";
  }
}

/**
 * Amount for an hourly billable log. Fixed-price services bill separately.
 */
export function hourlyLogAmount(
  durationMinutes: number,
  resolved: ResolvedRate
): number {
  if (resolved.missing || resolved.rate <= 0) return 0;
  const hours = (durationMinutes ?? 0) / 60;
  return Math.round(hours * resolved.rate * 100) / 100;
}
