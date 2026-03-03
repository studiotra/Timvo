"use client";

import Image from "next/image";

type BusinessInfo = {
  name: string;
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
};

type InvoiceData = {
  id: string;
  status: string;
  total_amount: number;
  subtotal?: number;
  tax_rate?: number | null;
  tax_amount?: number;
  currency: string;
  issued_at: string;
  due_at: string;
  stripe_payment_url: string | null;
  footer: string;
  terms_and_conditions: string;
};

type ItemData = {
  id: string;
  description: string;
  quantity: number;
  unit_rate: number;
  amount: number;
  sort_order: number;
};

export function PublicInvoiceView({
  businessInfo,
  invoice,
  client,
  project,
  items,
  paidSuccess,
  isFixedProject = false,
}: {
  businessInfo: BusinessInfo;
  invoice: InvoiceData;
  client: { name?: string; email?: string } | null;
  project: { name?: string } | null;
  items: ItemData[];
  paidSuccess?: boolean;
  isFixedProject?: boolean;
}) {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {paidSuccess && (
          <div className="mb-6 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-6 py-4 text-center">
            <p className="font-semibold text-emerald-400">Payment successful</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Thank you for your payment.</p>
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-lg">
          <div className="mb-8 flex items-start justify-between">
            <div>
              {businessInfo.logoUrl ? (
                <div className="relative h-12 w-32">
                  <Image
                    src={businessInfo.logoUrl}
                    alt={businessInfo.name}
                    fill
                    className="object-contain object-left"
                    unoptimized
                  />
                </div>
              ) : (
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">{businessInfo.name}</h1>
              )}
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Invoice</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                Invoice #{invoice.id.slice(0, 8)}
              </p>
              <span
                className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                  invoice.status === "paid"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : invoice.status === "sent"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-[var(--border)] text-[var(--text-muted)]"
                }`}
              >
                {invoice.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                Bill From
              </p>
              <p className="font-semibold text-[var(--text-primary)]">{businessInfo.name}</p>
              {(businessInfo.address || businessInfo.phone) && (
                <div className="mt-1 text-sm text-[var(--text-secondary)] space-y-0.5">
                  {businessInfo.address && <p className="whitespace-pre-wrap">{businessInfo.address}</p>}
                  {businessInfo.phone && <p>{businessInfo.phone}</p>}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase mb-1">
                Bill To
              </p>
              <p className="font-semibold text-[var(--text-primary)]">{client?.name ?? "—"}</p>
              {client?.email && (
                <p className="text-sm text-[var(--text-secondary)]">{client.email}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-8 mb-8 text-sm text-[var(--text-secondary)]">
            <span>Issued: {invoice.issued_at || "—"}</span>
            <span>Due: {invoice.due_at || "—"}</span>
            {project?.name && <span>Project: {project.name}</span>}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-strong)]">
                <th className="text-left py-3 font-semibold text-[var(--text-secondary)]">
                  Description
                </th>
                {!isFixedProject && (
                  <>
                    <th className="text-right py-3 font-semibold text-[var(--text-secondary)]">Qty</th>
                    <th className="text-right py-3 font-semibold text-[var(--text-secondary)]">Rate</th>
                    <th className="text-right py-3 font-semibold text-[var(--text-secondary)]">Amount</th>
                  </>
                )}
                {isFixedProject && (
                  <th className="text-right py-3 font-semibold text-[var(--text-secondary)]">Amount</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)]">
                  <td className="py-3 text-[var(--text-primary)]">{row.description}</td>
                  {!isFixedProject && (
                    <>
                      <td className="py-3 text-right font-mono text-[var(--text-primary)]">{row.quantity}</td>
                      <td className="py-3 text-right font-mono text-[var(--text-primary)]">
                        {row.unit_rate != null ? `$${row.unit_rate.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 text-right font-mono text-[var(--text-primary)]">
                        ${row.amount.toFixed(2)}
                      </td>
                    </>
                  )}
                  {isFixedProject && (
                    <td className="py-3 text-right font-mono text-[var(--text-primary)]">
                      {row.amount > 0 ? `$${row.amount.toFixed(2)}` : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end flex-col items-end gap-1">
            {invoice.tax_rate != null && invoice.tax_rate > 0 && invoice.subtotal != null && invoice.tax_amount != null && (
              <>
                <p className="text-sm text-[var(--text-secondary)]">
                  Subtotal: {invoice.currency} ${invoice.subtotal.toFixed(2)}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Tax ({invoice.tax_rate}%): {invoice.currency} ${invoice.tax_amount.toFixed(2)}
                </p>
              </>
            )}
            <p className="text-xl font-bold font-serif text-[var(--text-primary)]">
              Total: {invoice.currency} ${invoice.total_amount.toFixed(2)}
            </p>
          </div>

          {(invoice.footer || invoice.terms_and_conditions) && (
            <div className="mt-8 pt-6 border-t border-[var(--border-strong)] text-sm text-[var(--text-secondary)] space-y-2">
              {invoice.terms_and_conditions && (
                <div>
                  <p className="font-semibold text-[var(--text-primary)] text-xs uppercase mb-1">
                    Terms & Conditions
                  </p>
                  <p className="whitespace-pre-wrap text-[var(--text-secondary)]">
                    {invoice.terms_and_conditions}
                  </p>
                </div>
              )}
              {invoice.footer && (
                <div>
                  <p className="font-semibold text-[var(--text-primary)] text-xs uppercase mb-1">
                    Footer
                  </p>
                  <p className="whitespace-pre-wrap text-[var(--text-secondary)]">{invoice.footer}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {invoice.status !== "paid" && invoice.stripe_payment_url && (
          <div className="mt-8 text-center">
            <a
              href={invoice.stripe_payment_url}
              className="inline-block px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg transition-colors"
            >
              Pay Online
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
