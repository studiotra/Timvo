/**
 * Human-facing invoice numbers: prefix (e.g. INV-) + padded sequence.
 * Never display raw UUIDs; keep casing consistent (prefix uppercased).
 */

export const DEFAULT_INVOICE_PREFIX = "INV-";

/** Normalize a Settings invoice prefix to a consistent uppercase form. */
export function normalizeInvoicePrefix(prefix: string | null | undefined): string {
  let p = (prefix ?? DEFAULT_INVOICE_PREFIX).trim();
  if (!p) p = DEFAULT_INVOICE_PREFIX;
  p = p.toUpperCase();
  // Plain letters like "INV" get a trailing dash for readability
  if (/^[A-Z]+$/.test(p)) p = `${p}-`;
  return p;
}

/**
 * Format a display invoice number, e.g. INV-0042.
 * Returns null when no sequence is available (caller should not fall back to UUID).
 */
export function formatInvoiceNumber(
  prefix: string | null | undefined,
  sequence: number | null | undefined
): string | null {
  if (sequence == null || !Number.isFinite(sequence) || sequence < 1) return null;
  const p = normalizeInvoicePrefix(prefix);
  const n = Math.floor(sequence);
  return `${p}${String(n).padStart(4, "0")}`;
}

/** Label for UI: formatted number, or a short placeholder — never a raw id. */
export function invoiceNumberLabel(
  prefix: string | null | undefined,
  sequence: number | null | undefined
): string {
  return formatInvoiceNumber(prefix, sequence) ?? "—";
}
