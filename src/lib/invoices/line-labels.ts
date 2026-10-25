/** Placeholder used when a log has no task name or description. */
export const INVOICE_TIME_PLACEHOLDER = "Time";

export type InvoiceLogLabelInput = {
  taskId?: string | null;
  taskName?: string | null;
  description?: string | null;
  /** Polished text from AI, if any. */
  polished?: string | null;
  fallback?: string;
};

export type InvoiceLogLabel = {
  /** Line description shown on the invoice. */
  label: string;
  /** Group key: task_id, else the pre-polish label. Never polished text. */
  groupKey: string;
  /** Task name or real description, before polish. */
  prePolishLabel: string;
  /** Text that would be sent to AI polish (never the placeholder). */
  polishInput: string | null;
};

/** Text to send to AI polish: real description, else task name. Skip empty. */
export function polishSourceText(
  description?: string | null,
  taskName?: string | null
): string | null {
  const text = description?.trim() || taskName?.trim() || "";
  return text || null;
}

/**
 * Build an invoice line label.
 * - Base label is task name or a real (trimmed) description.
 * - Polished text wins only when it is non-empty and different from the polish input.
 * - A placeholder such as "Time" never overrides a real task name or description.
 */
export function buildInvoiceLogLabel(input: InvoiceLogLabelInput): InvoiceLogLabel {
  const fallback = input.fallback?.trim() || INVOICE_TIME_PLACEHOLDER;
  const taskName = input.taskName?.trim() || "";
  const description = input.description?.trim() || "";
  const prePolishLabel = taskName || description || fallback;
  const polishInput = polishSourceText(description, taskName);
  const polished = input.polished?.trim() || "";

  let label = prePolishLabel;
  if (polished && polishInput && polished !== polishInput) {
    const polishedIsPlaceholder = polished === fallback;
    const hasRealBase = Boolean(taskName || description);
    if (!(polishedIsPlaceholder && hasRealBase)) {
      label = polished;
    }
  }

  const groupKey = input.taskId?.trim() || prePolishLabel;
  return { label, groupKey, prePolishLabel, polishInput };
}

export function groupLogsByTask<T extends InvoiceLogLabelInput>(
  logs: T[]
): { groupKey: string; label: string; logs: T[] }[] {
  const groups = new Map<string, { label: string; logs: T[] }>();
  for (const log of logs) {
    const built = buildInvoiceLogLabel(log);
    const existing = groups.get(built.groupKey);
    if (existing) {
      existing.logs.push(log);
    } else {
      groups.set(built.groupKey, { label: built.label, logs: [log] });
    }
  }
  return [...groups.entries()].map(([groupKey, g]) => ({
    groupKey,
    label: g.label,
    logs: g.logs,
  }));
}
