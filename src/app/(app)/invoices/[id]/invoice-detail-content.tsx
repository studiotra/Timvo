"use client";

import { useState } from "react";
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

export function InvoiceDetailContent({
  invoice,
  client,
  project,
  items,
}: {
  invoice: InvoiceData;
  client: { name?: string; email?: string } | null;
  project: { name?: string } | null;
  items: ItemData[];
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
      alert(r.error);
      return;
    }
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

  return (
    <>
      <div
        id="invoice-print"
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-lg text-[var(--text-primary)]"
      >
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Timvo</h1>
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
              className="mt-1 block rounded px-2 py-0.5 text-xs font-semibold uppercase border-0 cursor-pointer focus:ring-2 focus:ring-accent/50 focus:outline-none"
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
              Bill To
            </p>
            <p className="font-semibold text-[var(--text-primary)]">{client?.name ?? "—"}</p>
            {client?.email && (
              <p className="text-sm text-[var(--text-secondary)]">{client.email}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-secondary)]">Issued: {invoice.issued_at || "—"}</p>
            <p className="text-xs text-[var(--text-secondary)]">Due: {invoice.due_at || "—"}</p>
            {project?.name && (
              <p className="text-sm mt-2 text-[var(--text-primary)]">Project: {project.name}</p>
            )}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-strong)]">
              <th className="text-left py-3 font-semibold text-[var(--text-secondary)]">
                Description
              </th>
              <th className="text-right py-3 font-semibold text-[var(--text-secondary)]">
                Qty
              </th>
              <th className="text-right py-3 font-semibold text-[var(--text-secondary)]">
                Rate
              </th>
              <th className="text-right py-3 font-semibold text-[var(--text-secondary)]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)]">
                <td className="py-3 text-[var(--text-primary)]">{row.description}</td>
                <td className="py-3 text-right font-mono text-[var(--text-primary)]">{row.quantity}</td>
                <td className="py-3 text-right font-mono text-[var(--text-primary)]">
                  {row.unit_rate != null ? `$${row.unit_rate.toFixed(2)}` : "—"}
                </td>
                <td className="py-3 text-right font-mono text-[var(--text-primary)]">
                  ${row.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
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
                <p className="whitespace-pre-wrap text-[var(--text-secondary)]">{invoice.terms_and_conditions}</p>
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

      <div className="mt-6 flex flex-wrap gap-3 items-center">
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
