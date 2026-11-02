"use client";

import { useState } from "react";
import { toast } from "sonner";

type Props = {
  url: string;
};

export function InvoiceClientLink({ url }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Client link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <p className="no-print mb-4 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-muted)]">
      <span>
        Client link:{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:underline"
        >
          {url}
        </a>
      </span>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="rounded border border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--row-hover)]"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </p>
  );
}
