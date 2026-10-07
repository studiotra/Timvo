/**
 * Pure aggregation for client detail summary cards.
 */

export type ClientSummaryInput = {
  totalMinutes: number;
  unbilledAmount: number;
  invoiceTotal: number;
  paidInvoiceTotal: number;
};

export type ClientSummary = {
  totalHours: number;
  unbilledAmount: number;
  invoiceTotal: number;
  paidInvoiceTotal: number;
};

export function buildClientSummary(input: ClientSummaryInput): ClientSummary {
  return {
    totalHours: Math.round((input.totalMinutes / 60) * 10) / 10,
    unbilledAmount: roundMoney(input.unbilledAmount),
    invoiceTotal: roundMoney(input.invoiceTotal),
    paidInvoiceTotal: roundMoney(input.paidInvoiceTotal),
  };
}

function roundMoney(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

export function formatCurrencyAmount(
  amount: number,
  currency: string
): string {
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
