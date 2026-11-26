"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  dismissRetainerInvoiceReminder,
  syncAndListRetainerReminders,
  type RetainerInvoiceReminder,
} from "@/app/actions/retainer-invoices";

function reminderCopy(item: RetainerInvoiceReminder): string {
  if (item.mode === "auto") {
    if (item.invoiceIds.length === 0) {
      return (
        item.detail ??
        `It’s invoice day for ${item.clientName}, but no active project has a retainer amount.`
      );
    }
    const noun = item.invoiceIds.length === 1 ? "a draft invoice" : `${item.invoiceIds.length} draft invoices`;
    const period = item.periodLabel ? ` for ${item.periodLabel}` : "";
    return `Timvo created ${noun} for ${item.clientName}${period}. Review it before you send it.`;
  }
  return `Create the invoice for ${item.clientName} on ${item.occurrenceLabel}.`;
}

export function RetainerInvoiceReminders() {
  const pathname = usePathname();
  const [items, setItems] = useState<RetainerInvoiceReminder[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    syncAndListRetainerReminders().then((next) => {
      if (!cancelled) setItems(next);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!items.length) return null;

  async function dismiss(id: string) {
    setBusyId(id);
    const result = await dismissRetainerInvoiceReminder(id);
    setBusyId(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="mb-4 space-y-2">
      {items.map((item) => {
        const href =
          item.invoiceIds.length === 1
            ? `/invoices/${item.invoiceIds[0]}`
            : item.invoiceIds.length > 1
              ? "/invoices"
              : `/clients/${item.clientId}`;
        const action =
          item.invoiceIds.length === 1
            ? "Review invoice"
            : item.invoiceIds.length > 1
              ? "Review invoices"
              : "Open client";
        return (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-[var(--text-primary)]">{reminderCopy(item)}</p>
            <div className="flex flex-shrink-0 gap-2">
              <Link
                href={href}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
              >
                {action}
              </Link>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => dismiss(item.id)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--row-hover)] disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
