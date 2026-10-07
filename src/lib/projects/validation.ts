/**
 * Client/server validation for project numeric fields.
 * Matches Postgres decimal limits (no raw "numeric field overflow" to users).
 */

/** estimated_hours is decimal(8, 2) → max 999999.99 */
export const ESTIMATED_HOURS_MAX = 999_999.99;
/** retainer_hours is decimal(6, 2) */
export const RETAINER_HOURS_MAX = 9_999.99;
/** money fields are decimal(10, 2) */
export const MONEY_MAX = 99_999_999.99;
/** tax_rate percent 0–100 */
export const TAX_RATE_MAX = 100;

export type ParsedNumber =
  | { ok: true; value: number | null }
  | { ok: false; error: string };

/**
 * Parse an optional non-negative number within [0, max].
 * Empty string → null. Keeps the raw input for the caller to preserve on error.
 */
export function parseOptionalBoundedNumber(
  raw: string | null | undefined,
  options: { max: number; label: string; allowZero?: boolean }
): ParsedNumber {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { ok: true, value: null };

  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return { ok: false, error: `${options.label} must be a number.` };
  }
  if (n < 0) {
    return { ok: false, error: `${options.label} cannot be negative.` };
  }
  if (options.allowZero === false && n === 0) {
    return { ok: false, error: `${options.label} must be greater than zero.` };
  }
  if (n > options.max) {
    return {
      ok: false,
      error: `${options.label} must be ${options.max.toLocaleString("en-CA")} or less.`,
    };
  }
  return { ok: true, value: n };
}

export function parseEstimatedHours(raw: string | null | undefined): ParsedNumber {
  return parseOptionalBoundedNumber(raw, {
    max: ESTIMATED_HOURS_MAX,
    label: "Est. hours",
  });
}

export function parseHourlyRate(raw: string | null | undefined): ParsedNumber {
  return parseOptionalBoundedNumber(raw, {
    max: MONEY_MAX,
    label: "Hourly rate",
  });
}

export function parseMoneyField(
  raw: string | null | undefined,
  label: string
): ParsedNumber {
  return parseOptionalBoundedNumber(raw, { max: MONEY_MAX, label });
}

export function parseRetainerHours(raw: string | null | undefined): ParsedNumber {
  return parseOptionalBoundedNumber(raw, {
    max: RETAINER_HOURS_MAX,
    label: "Retainer hours",
  });
}

export function parseTaxRatePercent(raw: string | null | undefined): ParsedNumber {
  return parseOptionalBoundedNumber(raw, {
    max: TAX_RATE_MAX,
    label: "Tax rate",
  });
}

/** Map Postgres / Supabase overflow errors to a short user message. */
export function friendlyDbError(message: string | null | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (
    m.includes("numeric field overflow") ||
    m.includes("numeric value out of range") ||
    m.includes("value out of range")
  ) {
    return "One of the numbers is too large. Check Est. hours and money fields.";
  }
  return message?.trim() || "Something went wrong. Please try again.";
}

/** Same-client duplicate project name (case-insensitive). */
export function isDuplicateProjectName(
  name: string,
  existingNames: string[],
  options?: { excludeName?: string | null }
): boolean {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;
  const exclude = options?.excludeName?.trim().toLowerCase() ?? null;
  return existingNames.some((n) => {
    const other = n.trim().toLowerCase();
    if (!other) return false;
    if (exclude && other === exclude) return false;
    return other === normalized;
  });
}
