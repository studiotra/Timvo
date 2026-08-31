"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendInvoice, resendInvoice } from "@/app/actions/send-invoice";

type Props = {
  invoiceId: string;
  status: "draft" | "sent" | "paid" | "overdue";
  paymentUrl: string | null;
};

export function SendInvoiceButton({ invoiceId, status, paymentUrl }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setLoading(true);
    setError(null);
    const result = await sendInvoice(invoiceId);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success("Invoice sent! Your client will receive an email shortly.");
    router.refresh();
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    const result = await resendInvoice(invoiceId);
    setResending(false);
    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success("Invoice resent to your client.");
    router.refresh();
  }

  if (status === "paid") {
    return (
      <span className="rounded-lg bg-success/20 px-4 py-2 text-sm font-semibold text-success">
        Paid
      </span>
    );
  }

  if (status === "overdue" || status === "sent") {
    return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {paymentUrl && (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={
                status === "overdue"
                  ? "rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/30"
                  : "rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/80"
              }
            >
              Pay Online
            </a>
          )}
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resending}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--row-hover)] disabled:opacity-50"
          >
            {resending ? "Resending…" : "Resend email"}
          </button>
          <span
            className={
              status === "overdue"
                ? "text-sm font-medium text-red-400"
                : "text-sm text-[var(--text-muted)]"
            }
          >
            {status === "overdue" ? "Overdue" : "Sent"}
          </span>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={loading}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {loading ? "Sending…" : "Send Invoice"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
