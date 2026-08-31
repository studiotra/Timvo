"use client";

import { toast } from "sonner";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PrintInvoiceButton } from "@/components/print-invoice-button";
import { SendInvoiceButton } from "@/components/send-invoice-button";
import { EditInvoiceSlideOver } from "@/components/edit-invoice-slide-over";
import { updateInvoiceStatus, deleteInvoice } from "@/app/actions/invoices";

const STATUSES = ["draft", "sent", "paid", "overdue"] as const;

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
  stripe_session_id?: string | null;
  paid_at?: string | null;
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

type BusinessInfo = {
  name: string;
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
};

export function InvoiceDetailContent({
  businessInfo,
  invoice,
  client,
  project,
  items,
  isFixedProject = false,
}: {
  businessInfo: BusinessInfo;
  invoice: InvoiceData;
  client: { name?: string; email?: string } | null;
  project: { name?: string } | null;
  items: ItemData[];
  isFixedProject?: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [status, setStatus] = useState(invoice.status);
  const [statusUpdating, setStatusUpdating] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setStatusUpdating(true);
    const r = await updateInvoiceStatus(invoice.id, newStatus);
    setStatusUpdating(false);
    if (r?.error) return;
    setStatus(newStatus);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    const r = await deleteInvoice(invoice.id);
    if (r?.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Invoice deleted");
    router.push("/invoices");
    router.refresh();
  }

  const statusStyles: Record<string, { backgroundColor: string; color: string }> = {
    draft: { backgroundColor: "var(--status-draft-bg)", color: "var(--status-draft-text)" },
    sent: { backgroundColor: "var(--status-sent-bg)", color: "var(--status-sent-text)" },
    paid: { backgroundColor: "var(--status-paid-bg)", color: "var(--status-paid-text)" },
    overdue: { backgroundColor: "var(--status-overdue-bg)", color: "var(--status-overdue-text)" },
  };
  const statusStyle = statusStyles[status] ?? statusStyles.draft;
  const footerText = invoice.footer?.trim() ?? "";
  const termsText = invoice.terms_and_conditions?.trim() ?? "";

  return (
    <>
      <div
        id="invoice-print"
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-lg text-[var(--text-primary)]"
      >
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
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusUpdating}
              className="no-print mt-1 block rounded px-2 py-0.5 text-xs font-semibold uppercase border-0 cursor-pointer focus:ring-2 focus:ring-accent/50 focus:outline-none"
              style={{
                backgroundColor: statusStyle.backgroundColor,
                color: statusStyle.color,
              }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
                {businessInfo.address && <p>{businessInfo.address}</p>}
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
          {invoice.paid_at && (
            <span>Paid: {new Date(invoice.paid_at).toLocaleDateString()}</span>
          )}
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
                  <th className="text-right py-3 font-semibold text-[var(--text-secondary)]">
                    Qty
                  </th>
                  <th className="text-right py-3 font-semibold text-[var(--text-secondary)]">
                    Rate
                  </th>
                  <th className="text-right py-3 font-semibold text-[var(--text-secondary)]">
                    Amount
                  </th>
                </>
              )}
              {isFixedProject && (
                <th className="text-right py-3 font-semibold text-[var(--text-secondary)]">
                  Amount
                </th>
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

        {(termsText || footerText) && (
          <div className="mt-8 pt-6 border-t border-[var(--border-strong)] text-sm text-[var(--text-secondary)] space-y-4">
            {termsText && (
              <div>
                <p className="font-semibold text-[var(--text-primary)] text-xs uppercase mb-1">
                  Terms & Conditions
                </p>
                <p className="whitespace-pre-wrap text-[var(--text-secondary)]">{termsText}</p>
              </div>
            )}
            {footerText && (
              <div>
                <p className="font-semibold text-[var(--text-primary)] text-xs uppercase mb-1">
                  Footer
                </p>
                <p className="whitespace-pre-wrap text-[var(--text-secondary)]">{footerText}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="no-print mt-6 flex flex-wrap gap-3 items-center">
        <PrintInvoiceButton />
        <SendInvoiceButton
          invoiceId={invoice.id}
          status={status as "draft" | "sent" | "paid" | "overdue"}
          paymentUrl={invoice.stripe_payment_url}
        />
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-semibold hover:bg-[var(--bg-card)]"
        >
          Edit Invoice
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="px-4 py-2 text-[var(--red)] hover:opacity-90 text-sm font-semibold"
        >
          Delete
        </button>
      </div>

      <EditInvoiceSlideOver
        open={editOpen}
        onClose={() => setEditOpen(false)}
        invoice={invoice}
        client={client}
        project={project}
        items={items}
        onSaved={() => {
          setEditOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
