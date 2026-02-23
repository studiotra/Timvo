"use client";

export function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg text-sm"
    >
      Print / Save as PDF
    </button>
  );
}
