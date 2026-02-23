"use client";

import { useState, useEffect } from "react";
import { SlideOver } from "./slide-over";
import { updateInvoice } from "@/app/actions/invoices";

type InvoiceData = {
  id: string;
  status: string;
  total_amount: number;
  currency: string;
  issued_at: string;
  due_at: string;
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

export function EditInvoiceSlideOver({
  open,
  onClose,
  invoice,
  client,
  project,
  items,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceData;
  client: { name?: string; email?: string } | null;
  project: { name?: string } | null;
  items: ItemData[];
  onSaved: () => void;
}) {
  const [status, setStatus] = useState(invoice.status);
  const [issuedAt, setIssuedAt] = useState(invoice.issued_at);
  const [dueAt, setDueAt] = useState(invoice.due_at);
  const [footer, setFooter] = useState(invoice.footer);
  const [terms, setTerms] = useState(invoice.terms_and_conditions);
  const [manualItems, setManualItems] = useState<ItemData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStatus(invoice.status);
      setIssuedAt(invoice.issued_at);
      setDueAt(invoice.due_at);
      setFooter(invoice.footer);
      setTerms(invoice.terms_and_conditions);
      setManualItems([...items]);
      setError(null);
    }
  }, [open, invoice, items]);

  function addItem() {
    setManualItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit_rate: 0,
        amount: 0,
        sort_order: prev.length,
      },
    ]);
  }
  function removeItem(id: string) {
    setManualItems((prev) => prev.filter((m) => m.id !== id));
  }
  function updateItem(id: string, field: keyof ItemData, value: string | number) {
    setManualItems((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, [field]: value };
        if (field === "quantity" || field === "unit_rate") {
          next.amount = Math.round(Number(next.quantity) * Number(next.unit_rate) * 100) / 100;
        }
        return next;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = manualItems.filter(
      (m) => m.description.trim() && !isNaN(m.quantity) && !isNaN(m.unit_rate) && !isNaN(m.amount)
    );
    if (valid.length === 0) {
      setError("Add at least one line item.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const formData = new FormData();
    formData.set("invoice_id", invoice.id);
    formData.set("status", status);
    formData.set("issued_at", issuedAt);
    formData.set("due_at", dueAt);
    formData.set("footer", footer);
    formData.set("terms_and_conditions", terms);
    formData.set(
      "manual_items",
      JSON.stringify(
        valid.map((m) => ({
          id: m.id,
          description: m.description.trim(),
          quantity: m.quantity,
          unit_rate: m.unit_rate,
          amount: m.amount,
        }))
      )
    );
    const result = await updateInvoice(formData);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  const total = manualItems.reduce((s, m) => s + (isNaN(m.amount) ? 0 : m.amount), 0);

  return (
    <SlideOver open={open} onClose={onClose} title="Edit Invoice">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          <p className="text-sm text-[var(--text-muted)]">
            Client: {client?.name ?? "—"} · Project: {project?.name ?? "—"}
          </p>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Issued date
              </label>
              <input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Due date
              </label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Line items
              </label>
              <button type="button" onClick={addItem} className="text-xs text-accent hover:underline">
                + Add line
              </button>
            </div>
            <div className="space-y-2">
              {manualItems.map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_60px_80px_90px_auto] gap-2 items-center"
                >
                  <input
                    type="text"
                    placeholder="Description"
                    value={m.description}
                    onChange={(e) => updateItem(m.id, "description", e.target.value)}
                    className="px-2 py-1.5 text-sm bg-[var(--bg-app)] border border-[var(--border)] rounded"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={m.quantity}
                    onChange={(e) => {
                      updateItem(m.id, "quantity", parseFloat(e.target.value) || 0);
                      const qty = parseFloat(e.target.value) || 0;
                      updateItem(m.id, "amount", Math.round(qty * m.unit_rate * 100) / 100);
                    }}
                    className="px-2 py-1.5 text-sm font-mono bg-[var(--bg-app)] border border-[var(--border)] rounded"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={m.unit_rate}
                    onChange={(e) => {
                      updateItem(m.id, "unit_rate", parseFloat(e.target.value) || 0);
                      const rate = parseFloat(e.target.value) || 0;
                      updateItem(m.id, "amount", Math.round(m.quantity * rate * 100) / 100);
                    }}
                    className="px-2 py-1.5 text-sm font-mono bg-[var(--bg-app)] border border-[var(--border)] rounded"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={m.amount}
                    onChange={(e) => updateItem(m.id, "amount", parseFloat(e.target.value) || 0)}
                    className="px-2 py-1.5 text-sm font-mono bg-[var(--bg-app)] border border-[var(--border)] rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(m.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Footer
            </label>
            <textarea
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              rows={2}
              placeholder="e.g. Thank you for your business"
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Terms & Conditions
            </label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={4}
              placeholder="Payment is due within 30 days..."
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
            />
          </div>
          <p className="font-mono text-sm font-semibold">Total: ${total.toFixed(2)}</p>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="p-5 border-t border-[var(--border)] flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-card)]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </SlideOver>
  );
}
