"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendInvoice } from "@/app/actions/send-invoice";

type Props = {
  invoiceId: string;
  status: "draft" | "sent" | "paid" | "overdue";
  paymentUrl: string | null;
};

export function SendInvoiceButton({ invoiceId, status, paymentUrl }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setLoading(true);
    setError(null);
    const result = await sendInvoice(invoiceId);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (status === "paid") {
    return (
      <span className="px-4 py-2 bg-success/20 text-success font-semibold rounded-lg text-sm">
        Paid
      </span>
    );
  }

  if (status === "overdue") {
    return (
      <div className="flex items-center gap-3">
        {paymentUrl && (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-amber-500/20 text-amber-400 font-semibold rounded-lg text-sm hover:bg-amber-500/30"
          >
            Pay Online
          </a>
        )}
        <span className="text-[var(--text-muted)] text-sm">Overdue</span>
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="flex items-center gap-3">
        {paymentUrl && (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-success hover:bg-success/80 text-white font-semibold rounded-lg text-sm"
          >
            Pay Online
          </a>
        )}
        <span className="text-[var(--text-muted)] text-sm">Sent</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSend}
        disabled={loading}
        className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg text-sm disabled:opacity-50"
      >
        {loading ? "Sending…" : "Send Invoice"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
