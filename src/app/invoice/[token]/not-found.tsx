export default function InvoiceNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 max-w-md text-center">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Invoice not found</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          This link may have expired or is invalid. Please contact the sender for a new invoice link.
        </p>
      </div>
    </div>
  );
}
