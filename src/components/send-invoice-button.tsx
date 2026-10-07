"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendInvoice, resendInvoice } from "@/app/actions/send-invoice";

type Props = {
  invoiceId: string;
  status: "draft" | "sent" | "paid" | "overdue";
  paymentUrl: string | null;
  /** True only after a successful Send/Resend email (view_token set). */
  hasBeenEmailed?: boolean;
};

export function SendInvoiceButton({
  invoiceId,
  status,
  paymentUrl,
  hasBeenEmailed = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setLoading(true);
    setError(null);
    const result = hasBeenEmailed
      ? await resendInvoice(invoiceId)
      : await sendInvoice(invoiceId);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(
      hasBeenEmailed
        ? "Invoice resent to your client."
        : "Invoice sent! Your client will receive an email shortly."
    );
    router.refresh();
  }

  if (status === "paid") {
    return (
      <span className="rounded-lg bg-success/20 px-4 py-2 text-sm font-semibold text-success">
        Paid
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {paymentUrl && (status === "sent" || status === "overdue") && (
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
          onClick={() => void handleSend()}
          disabled={loading}
          className={
            hasBeenEmailed
              ? "rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--row-hover)] disabled:opacity-50"
              : "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          }
        >
          {loading
            ? hasBeenEmailed
              ? "Resending…"
              : "Sending…"
            : hasBeenEmailed
              ? "Resend email"
              : "Send"}
        </button>
        {(status === "sent" || status === "overdue") && (
          <span
            className={
              status === "overdue"
                ? "text-sm font-medium text-red-400"
                : "text-sm text-[var(--text-muted)]"
            }
          >
            {status === "overdue" ? "Overdue" : "Sent"}
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
