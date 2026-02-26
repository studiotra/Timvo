"use client";

import { useState, useEffect, useCallback } from "react";
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

export function CreateInvoiceSlideOver({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
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
  type ManualItem = { id: string; description: string; quantity: string; unit_rate: string; amount: string };
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [footer, setFooter] = useState("");
  const [terms, setTerms] = useState("");

  const loadClients = useCallback(async () => {
    const c = await getClientsForInvoice();
    setClients(c);
  }, []);

  useEffect(() => {
    if (open) {
      loadClients();
      setClientId("");
      setProjectId("");
      setLogs([]);
      setProjects([]);
      setSelected(new Set());
      setManualItems([]);
      setError(null);
      getDefaultInvoiceSettings().then((s) => {
        setFooter(s.default_footer ?? "");
        setTerms(s.default_terms ?? "");
        const d = new Date();
        d.setDate(d.getDate() + s.default_due_days);
        setDueAt(d.toISOString().slice(0, 10));
      });
    }
  }, [open, loadClients]);

  useEffect(() => {
    if (!clientId) {
      setProjects([]);
      setProjectId("");
      setLogs([]);
      return;
    }
    getProjectsForInvoice(clientId).then(setProjects);
    setProjectId("");
    setLogs([]);
  }, [clientId]);

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

  function addManualItem() {
    setManualItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", quantity: "1", unit_rate: "", amount: "" },
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

  async function handleSubmit() {
    const validManual = manualItems.filter(
      (m) => m.description.trim() && !isNaN(parseFloat(m.quantity)) && !isNaN(parseFloat(m.unit_rate)) && !isNaN(parseFloat(m.amount))
    );
    if (!clientId || !projectId || (selected.size === 0 && validManual.length === 0)) {
      setError("Select at least one log or add a manual line item.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const polishedDescriptions: Record<string, string> = {};
    if (aiPolish) {
      for (const log of logs) {
        if (selected.has(log.id)) {
          polishedDescriptions[log.id] = await polishDescription(
            log.description ?? "Time"
          );
        }
      }
    }
    const formData = new FormData();
    formData.set("client_id", clientId);
    formData.set("project_id", projectId);
    formData.set("due_at", dueAt);
    formData.set("footer", footer);
    formData.set("terms_and_conditions", terms);
    formData.set("log_ids", JSON.stringify([...selected]));
    formData.set("polished_descriptions", JSON.stringify(polishedDescriptions));
    formData.set(
      "manual_items",
      JSON.stringify(
        validManual.map((m) => ({
          description: m.description.trim(),
          quantity: parseFloat(m.quantity) || 1,
          unit_rate: parseFloat(m.unit_rate) || 0,
          amount: parseFloat(m.amount) || 0,
        }))
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
    onClose();
    window.location.href = `/invoices/${result.invoiceId}`;
  }

  const logsTotal = (() => {
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
    return total;
  })();
  const manualTotal = manualItems.reduce((s, m) => {
    const amt = parseFloat(m.amount);
    return s + (isNaN(amt) ? 0 : amt);
  }, 0);
  const totalAmount = logsTotal + manualTotal;

  return (
    <SlideOver open={open} onClose={onClose} title="Create Invoice">
      <div className="flex flex-col h-full">
        <div className="p-5 space-y-4 flex-1">
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Logs to include (grouped by task in invoice)
            </p>
            {loading ? (
              <p className="text-sm text-[var(--text-muted)]">Loading…</p>
            ) : logs.length === 0 && projectId ? (
              <p className="text-sm text-[var(--text-muted)]">
                No unbilled logs for this project.
              </p>
            ) : (
              <div className="space-y-0 divide-y divide-[var(--border)]">
                {logs.map((log) => (
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
                    <span className="flex-1 text-sm">
                      {log.task_name ? (
                        <>
                          <span className="text-[var(--text-muted)]">[{log.task_name}] </span>
                          {log.description || "Time"}
                        </>
                      ) : (
                        log.description || "Time"
                      )}
                    </span>
                    <span className="font-mono text-xs text-[var(--text-secondary)]">
                      {(log.duration_minutes / 60).toFixed(1)}h · ${log.amount.toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
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
                {manualItems.map((m) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-[1fr_60px_80px_90px_auto] gap-2 items-center"
                  >
                    <input
                      type="text"
                      placeholder="Description"
                      value={m.description}
                      onChange={(e) => updateManualItem(m.id, "description", e.target.value)}
                      className="px-2 py-1.5 text-sm bg-[var(--bg-app)] border border-[var(--border)] rounded"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="0"
                      step="0.01"
                      value={m.quantity}
                      onChange={(e) => {
                        updateManualItem(m.id, "quantity", e.target.value);
                        const qty = parseFloat(e.target.value) || 0;
                        const rate = parseFloat(m.unit_rate) || 0;
                        updateManualItem(m.id, "amount", (qty * rate).toFixed(2));
                      }}
                      className="px-2 py-1.5 text-sm font-mono bg-[var(--bg-app)] border border-[var(--border)] rounded"
                    />
                    <input
                      type="number"
                      placeholder="Rate"
                      min="0"
                      step="0.01"
                      value={m.unit_rate}
                      onChange={(e) => {
                        updateManualItem(m.id, "unit_rate", e.target.value);
                        const qty = parseFloat(m.quantity) || 0;
                        const rate = parseFloat(e.target.value) || 0;
                        updateManualItem(m.id, "amount", (qty * rate).toFixed(2));
                      }}
                      className="px-2 py-1.5 text-sm font-mono bg-[var(--bg-app)] border border-[var(--border)] rounded"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      min="0"
                      step="0.01"
                      value={m.amount}
                      onChange={(e) => updateManualItem(m.id, "amount", e.target.value)}
                      className="px-2 py-1.5 text-sm font-mono bg-[var(--bg-app)] border border-[var(--border)] rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeManualItem(m.id)}
                      className="text-red-400 hover:text-red-300 text-sm px-1"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {(selected.size > 0 || manualItems.length > 0) && (
            <p className="font-mono text-sm font-semibold">
              Total: ${totalAmount.toFixed(2)}
            </p>
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
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="p-5 border-t border-[var(--border)] flex gap-3 justify-end">
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
            disabled={submitting || (selected.size === 0 && manualItems.every((m) => !m.description.trim()))}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg text-sm disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create & Lock"}
          </button>
        </div>
      </div>
    </SlideOver>
  );
}
