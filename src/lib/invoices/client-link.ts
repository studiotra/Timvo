import { randomBytes } from "crypto";

/** Send vs Resend is driven by invoice lifecycle status, not view_token. */
export function invoiceHasBeenEmailed(status: string): boolean {
  return status === "sent" || status === "overdue" || status === "paid";
}

/** Public Pay Online only for payable (sent/overdue) invoices with a checkout URL. */
export function canShowPublicPayButton(
  status: string,
  paymentUrl: string | null | undefined
): boolean {
  return !!paymentUrl && (status === "sent" || status === "overdue");
}

/** Create a new opaque view_token (48 hex chars). */
export function createInvoiceViewToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Resolve which token to persist when sending/emailing.
 * Keep an existing token unless regenerateToken is requested.
 */
export function resolveViewTokenForSend(params: {
  existingToken: string | null | undefined;
  regenerateToken: boolean;
  createToken?: () => string;
}): string {
  const create = params.createToken ?? createInvoiceViewToken;
  if (params.regenerateToken || !params.existingToken) {
    return create();
  }
  return params.existingToken;
}
