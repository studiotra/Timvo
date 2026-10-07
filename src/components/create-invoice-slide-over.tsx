"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { SlideOver } from "./slide-over";
import { createInvoice, getDefaultInvoiceSettings } from "@/app/actions/invoices";
import {
  getClientsForInvoice,
  getProjectsForInvoice,
  getUnbilledLogs,
  type ClientOption,
  type ProjectOption,
  type UnbilledLog,
} from "@/app/actions/invoice-data";
import { polishDescription } from "@/app/actions/ai-polish";
import { addDaysToDateString, formatInstantAsLocalDate, localToday } from "@/lib/dates";
import { useTimezone } from "@/contexts/timezone-context";
import {
  computeInvoiceMoney,
  isZeroMoneyTotal,
  lineAmount,
  resolveTaxRate,
  roundCents,
} from "@/lib/invoices/money";
import { formatInvoiceNumber, normalizeInvoicePrefix } from "@/lib/invoices/number";

export function CreateInvoiceSlideOver({
  open,
  onClose,
  initialClientId,
  initialProjectId,
}: {
  open: boolean;
  onClose: () => void;
  initialClientId?: string;
  initialProjectId?: string;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [logs, setLogs] = useState<UnbilledLog[]>([]);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPolish, setAiPolish] = useState(false);
  type ManualItem = { id: string; description: string; quantity: string; unit_rate: string };
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [footer, setFooter] = useState("");
  const [terms, setTerms] = useState("");
  const [taxRateInput, setTaxRateInput] = useState("");
  const [profileTaxRate, setProfileTaxRate] = useState<number | null>(null);
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<number | null>(null);
  const [groupByTask, setGroupByTask] = useState(true);
  const timezone = useTimezone();

  const loadClients = useCallback(async () => {
    const c = await getClientsForInvoice();
    setClients(c);
  }, []);

  useEffect(() => {
    if (open) {
      loadClients();
      if (initialClientId && initialProjectId) {
        setClientId(initialClientId);
        setProjectId(initialProjectId);
        getProjectsForInvoice(initialClientId).then(setProjects);
      } else {
        setClientId("");
        setProjectId("");
        setProjects([]);
      }
      setLogs([]);
      setSelected(new Set());
      setManualItems([]);
      setError(null);
      setGroupByTask(true);
      getDefaultInvoiceSettings().then((s) => {
        setFooter(s.default_footer ?? "");
        setTerms(s.default_terms ?? "");
        const tz = s.timezone || timezone;
        const today = localToday(tz);
        setIssuedAt(today);
        setDueAt(addDaysToDateString(today, s.default_due_days));
        setProfileTaxRate(s.default_tax_rate);
        setTaxRateInput(s.default_tax_rate != null ? String(s.default_tax_rate) : "");
        setInvoicePrefix(normalizeInvoicePrefix(s.invoice_prefix));
        setNextInvoiceNumber(s.next_invoice_number);
      });
    }
  }, [open, loadClients, initialClientId, initialProjectId, timezone]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      if (!initialClientId) setProjectId("");
      setLogs([]);
      return;
    }
    if (initialClientId && initialProjectId && clientId === initialClientId) return;
    getProjectsForInvoice(clientId).then(setProjects);
    if (!initialClientId || clientId !== initialClientId) setProjectId("");
    setLogs([]);
  }, [clientId, initialClientId, initialProjectId]);

  useEffect(() => {
    if (!projectId) {
      setLogs([]);
      setSelected(new Set());
      return;
    }
    setLoading(true);
    getUnbilledLogs(projectId, dateFrom || null, dateTo || null).then((l) => {
      setLogs(l);
      setSelected(new Set(l.map((x) => x.id)));
      setLoading(false);
    });
  }, [projectId, dateFrom, dateTo]);

  const selectedProject = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (!projectId) return;
    const resolved = resolveTaxRate(selectedProject?.tax_rate, profileTaxRate);
    setTaxRateInput(resolved != null ? String(resolved) : "");
  }, [projectId, selectedProject?.tax_rate, profileTaxRate]);

  function addManualItem() {
    setManualItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", quantity: "1", unit_rate: "" },
    ]);
  }
  function removeManualItem(id: string) {
    setManualItems((prev) => prev.filter((m) => m.id !== id));
  }
  function updateManualItem(id: string, field: keyof ManualItem, value: string) {
    setManualItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }
  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isFixedProject = selectedProject?.billing_type === "fixed" && (selectedProject?.agreed_fee ?? 0) > 0;
  const fixedPrice = selectedProject?.agreed_fee ?? 0;
  const selectedMissingRateCount = isFixedProject
    ? 0
    : logs.filter((l) => selected.has(l.id) && l.missing_rate).length;

  const parsedTaxRate = (() => {
    const n = parseFloat(taxRateInput);
    return !isNaN(n) && n > 0 ? n : null;
  })();

  const logsTotal = (() => {
    if (isFixedProject) return fixedPrice;
    const sel = logs.filter((l) => selected.has(l.id));
    const byService = new Map<string, UnbilledLog[]>();
    let total = 0;
    for (const l of sel) {
      if (l.service_id && l.service_billing_type === "fixed" && (l.service_default_rate ?? 0) > 0) {
        const arr = byService.get(l.service_id) ?? [];
        arr.push(l);
        byService.set(l.service_id, arr);
      } else {
        total += l.amount;
      }
    }
    for (const [, arr] of byService) {
      if (arr.length > 0) total += arr[0].service_default_rate ?? 0;
    }
    return roundCents(total);
  })();

  const manualLines = isFixedProject
    ? []
    : manualItems
        .filter((m) => m.description.trim())
        .map((m) => {
          const quantity = parseFloat(m.quantity);
          const unit_rate = parseFloat(m.unit_rate);
          const qty = Number.isFinite(quantity) ? quantity : 0;
          const rate = Number.isFinite(unit_rate) ? unit_rate : 0;
          return { quantity: qty, unit_rate: rate, amount: lineAmount(qty, rate) };
        });

  const money = computeInvoiceMoney(
    [{ amount: logsTotal }, ...manualLines],
    parsedTaxRate
  );

  const hasValidManual = manualItems.some((m) => m.description.trim());
  const canCreate =
    !!clientId &&
    !!projectId &&
    (selected.size > 0 || hasValidManual) &&
    !submitting;

  const disabledReason = (() => {
    if (submitting) return null;
    if (!clientId) return "Select a client to continue.";
    if (!projectId) return "Select a project to continue.";
    if (selected.size === 0 && !hasValidManual) {
      return "Select at least one log or add a manual line.";
    }
    return null;
  })();

  const numberPreview = formatInvoiceNumber(invoicePrefix, nextInvoiceNumber);

  async function handleSubmit() {
    const validManual = manualItems.filter((m) => {
      const qty = parseFloat(m.quantity);
      const rate = parseFloat(m.unit_rate);
      return m.description.trim() && Number.isFinite(qty) && Number.isFinite(rate);
    });
    if (!clientId || !projectId) {
      setError("Select client and project.");
      return;
    }
    if (isFixedProject) {
      if (selected.size === 0) {
        setError("Select at least one task to include in the invoice.");
        return;
      }
      if (fixedPrice <= 0) {
        setError("Fixed project must have an agreed fee. Edit the project to set it.");
        return;
      }
    } else if (selected.size === 0 && validManual.length === 0) {
      setError("Select at least one log or add a manual line item.");
      return;
    }
    if (isZeroMoneyTotal(money.total)) {
      const ok = window.confirm(
        "This invoice totals $0.00. Create it anyway?"
      );
      if (!ok) return;
    }
    setSubmitting(true);
    setError(null);
    const polishedDescriptions: Record<string, string> = {};
    if (aiPolish) {
      const selectedLogs = logs.filter((log) => selected.has(log.id));
      const polished = await Promise.all(
        selectedLogs.map(async (log) => ({
          id: log.id,
          text: await polishDescription(log.description ?? "Time"),
        }))
      );
      for (const row of polished) {
        polishedDescriptions[row.id] = row.text;
      }
    }
    const formData = new FormData();
    formData.set("client_id", clientId);
    formData.set("project_id", projectId);
    formData.set("issued_at", issuedAt);
    formData.set("due_at", dueAt);
    formData.set("footer", footer);
    formData.set("terms_and_conditions", terms);
    formData.set("tax_rate", taxRateInput);
    formData.set("group_by_task", groupByTask ? "true" : "false");
    formData.set("log_ids", JSON.stringify([...selected]));
    formData.set("polished_descriptions", JSON.stringify(polishedDescriptions));
    formData.set(
      "manual_items",
      JSON.stringify(
        validManual.map((m) => {
          const qty = parseFloat(m.quantity);
          const rate = parseFloat(m.unit_rate);
          return {
            description: m.description.trim(),
            quantity: qty,
            unit_rate: rate,
            amount: lineAmount(qty, rate),
          };
        })
      )
    );
    const result = await createInvoice(formData);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (!result.invoiceId) {
      setError("Invoice created but could not navigate.");
      return;
    }
    toast.success("Invoice created and locked");
    onClose();
    window.location.href = `/invoices/${result.invoiceId}`;
  }

  return (
    <SlideOver open={open} onClose={onClose} title="Create Invoice">
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Invoice number
              </label>
              <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 font-mono text-sm text-[var(--text-primary)]">
                {numberPreview ?? `${invoicePrefix}—`}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Issue date
              </label>
              <input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Client
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-accent"
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={!clientId}
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:ring-2 focus:ring-accent disabled:opacity-50"
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Date from
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-[13px] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Date to
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-[13px] text-[var(--text-primary)]"
              />
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Optional: limit unbilled logs to a date range
          </p>
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Tax (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRateInput}
                onChange={(e) => setTaxRateInput(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] font-mono"
              />
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
              rows={3}
              placeholder="Payment is due within 30 days..."
              className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
            />
          </div>
          {isFixedProject && (
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-4 py-3">
              <p className="text-sm font-medium text-indigo-300">Fixed price project</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Invoice will show tasks (no time) and total: ${fixedPrice.toLocaleString()}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Your reports will calculate effective rate: ${fixedPrice.toLocaleString()} ÷ total hours logged
              </p>
            </div>
          )}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                {isFixedProject
                  ? "Tasks completed (select each to include)"
                  : "Logs to include"}
              </p>
              {!isFixedProject && logs.length > 0 && (
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupByTask}
                    onChange={(e) => setGroupByTask(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-accent"
                  />
                  Group by task on invoice
                </label>
              )}
            </div>
            {loading ? (
              <p className="text-sm text-[var(--text-muted)]">Loading…</p>
            ) : logs.length === 0 && projectId ? (
              <p className="text-sm text-[var(--text-muted)]">
                No unbilled logs for this project.
              </p>
            ) : (
              <div className="space-y-0 divide-y divide-[var(--border)]">
                {logs.map((log) => {
                  const label =
                    log.task_name ?? (log.description?.trim() || "Uncategorized");
                  const dateLabel = log.started_at
                    ? formatInstantAsLocalDate(log.started_at, timezone)
                    : "";
                  return (
                    <label
                      key={log.id}
                      className="flex items-center gap-3 py-3 cursor-pointer hover:bg-[var(--bg-card)]/50 px-1 -mx-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(log.id)}
                        onChange={() => toggle(log.id)}
                        className="w-[18px] h-[18px] rounded border-[var(--border)] accent-accent"
                      />
                      <span className="flex-1 text-sm min-w-0">
                        <span className="text-[var(--text-primary)] font-medium block truncate">
                          {label}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] flex flex-wrap gap-x-2">
                          {dateLabel && <span>{dateLabel}</span>}
                          {log.service_name && <span>{log.service_name}</span>}
                          {log.description?.trim() &&
                            log.description.trim() !== label && (
                              <span className="truncate">{log.description.trim()}</span>
                            )}
                        </span>
                      </span>
                      {!isFixedProject && (
                        <span
                          className={`font-mono text-xs shrink-0 ${
                            log.missing_rate
                              ? "text-amber-400"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {(log.duration_minutes / 60).toFixed(1)}h · $
                          {log.amount.toFixed(2)}
                          {log.missing_rate ? " · no rate" : ""}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
            {!isFixedProject && selectedMissingRateCount > 0 && (
              <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {selectedMissingRateCount} selected log
                {selectedMissingRateCount === 1 ? "" : "s"} have no project or
                service rate and will bill at $0.00. Set a project rate or link a
                service before creating the invoice.
              </div>
            )}
            {!isFixedProject && logs.length > 0 && (
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                {groupByTask
                  ? "Same-task logs will be combined into one line on the invoice."
                  : "Each selected log will be its own line on the invoice."}
              </p>
            )}
          </div>
          {!isFixedProject && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Manual line items
              </p>
              <button
                type="button"
                onClick={addManualItem}
                className="text-xs text-accent hover:underline"
              >
                + Add line
              </button>
            </div>
            {manualItems.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_60px_80px_90px_auto] gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <span>Description</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>
                {manualItems.map((m) => {
                  const qty = parseFloat(m.quantity);
                  const rate = parseFloat(m.unit_rate);
                  const amt =
                    Number.isFinite(qty) && Number.isFinite(rate)
                      ? lineAmount(qty, rate)
                      : null;
                  return (
                    <div
                      key={m.id}
                      className="grid grid-cols-[1fr_60px_80px_90px_auto] gap-2 items-center"
                    >
                      <input
                        type="text"
                        placeholder="Description"
                        aria-label="Description"
                        value={m.description}
                        onChange={(e) => updateManualItem(m.id, "description", e.target.value)}
                        className="px-2 py-1.5 text-sm bg-[var(--bg-app)] border border-[var(--border)] rounded"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        aria-label="Quantity"
                        step="0.01"
                        value={m.quantity}
                        onChange={(e) => updateManualItem(m.id, "quantity", e.target.value)}
                        className="px-2 py-1.5 text-sm font-mono bg-[var(--bg-app)] border border-[var(--border)] rounded"
                      />
                      <input
                        type="number"
                        placeholder="Rate"
                        aria-label="Rate"
                        step="0.01"
                        value={m.unit_rate}
                        onChange={(e) => updateManualItem(m.id, "unit_rate", e.target.value)}
                        className="px-2 py-1.5 text-sm font-mono bg-[var(--bg-app)] border border-[var(--border)] rounded"
                      />
                      <span className="px-2 py-1.5 text-sm font-mono text-right text-[var(--text-secondary)]">
                        {amt != null ? `$${amt.toFixed(2)}` : "—"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeManualItem(m.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-1"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Use a negative rate for discounts (e.g. qty 1, rate −50).
            </p>
          </div>
          )}
          {(selected.size > 0 || manualItems.length > 0) && (
            <div className="rounded-lg border-2 border-accent/50 bg-accent/10 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Live total</p>
              {money.taxRate != null && (
                <>
                  <p className="font-mono text-sm text-[var(--text-secondary)]">
                    Subtotal: ${money.subtotal.toFixed(2)}
                  </p>
                  <p className="font-mono text-sm text-[var(--text-secondary)]">
                    Tax ({money.taxRate}%): ${money.taxAmount.toFixed(2)}
                  </p>
                </>
              )}
              <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                ${money.total.toFixed(2)}
                {money.taxRate != null && (
                  <span className="ml-2 text-xs font-sans font-normal text-[var(--text-muted)]">
                    incl. tax
                  </span>
                )}
              </p>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={aiPolish}
              onChange={(e) => setAiPolish(e.target.checked)}
              className="w-4 h-4 rounded accent-accent"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              AI Polish descriptions (requires OpenAI API key)
            </span>
          </label>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] p-5">
          {(selected.size > 0 || manualItems.length > 0) && (
            <p className="font-mono text-lg font-bold text-[var(--text-primary)]">
              Total: ${money.total.toFixed(2)}
            </p>
          )}
          <div className="flex flex-col items-end gap-2 ml-auto">
            {(error || disabledReason) && (
              <p className="text-sm text-red-400 max-w-xs text-right" role="alert">
                {error ?? disabledReason}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm hover:bg-[var(--bg-card)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canCreate}
                title={disabledReason ?? undefined}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg text-sm disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create & Lock"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </SlideOver>
  );
}
