/**
 * Shared invoice money math: per-line rounding, subtotal, tax, and total.
 * Use the same helpers in forms, server actions, detail, Print/PDF, and reports.
 */

export type LineMoneyInput = {
  quantity?: number | null;
  unit_rate?: number | null;
  amount?: number | null;
};

export type InvoiceMoney = {
  subtotal: number;
  taxRate: number | null;
  taxAmount: number;
  total: number;
};

/**
 * Round to nearest cent, half away from zero.
 * Uses a small epsilon so values like 1.005 survive float noise.
 */
export function roundCents(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * 100 + 1e-8)) / 100;
}

/** Line amount = qty × rate, rounded to cents. */
export function lineAmount(quantity: number, unitRate: number): number {
  return roundCents(Number(quantity) * Number(unitRate));
}

/**
 * Prefer project tax when set and > 0; otherwise Settings (profile) default.
 * Returns null when no tax applies.
 */
export function resolveTaxRate(
  projectTaxRate?: number | null,
  profileTaxRate?: number | null
): number | null {
  if (projectTaxRate != null && Number(projectTaxRate) > 0) {
    return Number(projectTaxRate);
  }
  if (profileTaxRate != null && Number(profileTaxRate) > 0) {
    return Number(profileTaxRate);
  }
  return null;
}

export function computeTaxAmount(
  subtotal: number,
  taxRatePercent: number | null | undefined
): number {
  if (taxRatePercent == null || taxRatePercent <= 0) return 0;
  return roundCents(subtotal * (taxRatePercent / 100));
}

/**
 * Subtotal from line amounts (already rounded per line), then tax and total.
 * When `recomputeFromQtyRate` is true, amount is derived from qty × rate
 * so callers cannot drift by sending a mismatched amount.
 */
export function computeInvoiceMoney(
  lines: LineMoneyInput[],
  taxRatePercent: number | null | undefined,
  options?: { recomputeFromQtyRate?: boolean }
): InvoiceMoney {
  const recompute = options?.recomputeFromQtyRate === true;
  const subtotal = roundCents(
    lines.reduce((sum, line) => {
      let amt: number;
      if (
        recompute &&
        line.quantity != null &&
        line.unit_rate != null &&
        Number.isFinite(Number(line.quantity)) &&
        Number.isFinite(Number(line.unit_rate))
      ) {
        amt = lineAmount(Number(line.quantity), Number(line.unit_rate));
      } else {
        amt = Number(line.amount ?? 0);
      }
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0)
  );
  const taxRate =
    taxRatePercent != null && taxRatePercent > 0 ? Number(taxRatePercent) : null;
  const taxAmount = computeTaxAmount(subtotal, taxRate);
  return {
    subtotal,
    taxRate,
    taxAmount,
    total: roundCents(subtotal + taxAmount),
  };
}

/**
 * Display money for an existing invoice.
 * - Prefer settings-based tax (project → profile).
 * - If stored total still looks pre-tax (legacy), show settings total with tax.
 * - If stored total differs (e.g. form tax override), derive tax from stored − subtotal.
 */
export function resolveDisplayMoney(
  lines: LineMoneyInput[],
  storedTotal: number | null | undefined,
  taxRatePercent: number | null | undefined,
  options?: { recomputeFromQtyRate?: boolean }
): InvoiceMoney {
  const fromSettings = computeInvoiceMoney(lines, taxRatePercent, options);
  const stored =
    storedTotal != null && Number.isFinite(Number(storedTotal))
      ? roundCents(Number(storedTotal))
      : null;

  if (stored == null) return fromSettings;
  if (Math.abs(stored - fromSettings.total) < 0.005) return fromSettings;
  // Legacy pre-tax total_amount — recompute with tax
  if (Math.abs(stored - fromSettings.subtotal) < 0.005) return fromSettings;

  const taxAmount = roundCents(stored - fromSettings.subtotal);
  if (taxAmount < 0) return { ...fromSettings, total: stored };
  const taxRate =
    fromSettings.subtotal > 0 && taxAmount > 0
      ? roundCents((taxAmount / fromSettings.subtotal) * 100)
      : null;
  return {
    subtotal: fromSettings.subtotal,
    taxRate,
    taxAmount,
    total: stored,
  };
}

/** True when the invoice total is effectively $0. Null/undefined are not zero. */
export function isZeroMoneyTotal(total: number | null | undefined): boolean {
  if (total == null || !Number.isFinite(Number(total))) return false;
  return Math.abs(Number(total)) < 0.005;
}

/** Normalize a tax % from form input; empty/invalid → null. */
export function parseTaxRateInput(raw: string | null | undefined): number | null {
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return null;
  return n;
}
