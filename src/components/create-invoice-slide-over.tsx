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
  type ManualItem = { id: string; description: string; quantity: string; amount: string };
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
      getDefaultInvoiceSettings().then((s) => {
        setFooter(s.default_footer ?? "");
        setTerms(s.default_terms ?? "");
        const d = new Date();
        d.setDate(d.getDate() + s.default_due_days);
        setDueAt(d.toISOString().slice(0, 10));
      });
    }
  }, [open, loadClients, initialClientId, initialProjectId]);

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

  function addManualItem() {
    setManualItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: "", quantity: "1", amount: "" },
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

  function toggleGroup(ids: string[]) {
    setSelected((s) => {
      const next = new Set(s);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  const groupedLogs = (() => {
    const byKey = new Map<string, { logs: UnbilledLog[]; totalMins: number; totalAmount: number }>();
    for (const log of logs) {
      const taskName = log.task_name ?? (log.description?.trim() || "Uncategorized");
      const key = `${taskName}::${log.service_id ?? ""}`;
      const existing = byKey.get(key);
      const mins = log.duration_minutes ?? 0;
      const amt = log.amount ?? 0;
      if (existing) {
        existing.logs.push(log);
        existing.totalMins += mins;
        existing.totalAmount += amt;
      } else {
        byKey.set(key, { logs: [log], totalMins: mins, totalAmount: amt });
      }
    }
    return Array.from(byKey.entries()).map(([key, v]) => {
      const first = v.logs[0];
      return {
        key,
        taskName: first.task_name ?? (first.description?.trim() || "Uncategorized"),
        serviceName: first.service_name ?? null,
        logIds: v.logs.map((l) => l.id),
        totalMins: v.totalMins,
        totalAmount: v.totalAmount,
      };
    });
  })();

  const selectedProject = projects.find((p) => p.id === projectId);
  const isFixedProject = selectedProject?.billing_type === "fixed" && (selectedProject?.agreed_fee ?? 0) > 0;
  const fixedPrice = selectedProject?.agreed_fee ?? 0;

  async function handleSubmit() {
    const validManual = manualItems.filter(
      (m) => m.description.trim() && !isNaN(parseFloat(m.quantity)) && !isNaN(parseFloat(m.amount))
    );
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
        validManual.map((m) => {
          const qty = parseFloat(m.quantity) || 1;
          const amt = parseFloat(m.amount) || 0;
          return {
            description: m.description.trim(),
            quantity: qty,
            unit_rate: qty > 0 ? amt / qty : 0,
            amount: amt,
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
    toast.success("Invoice created");
    onClose();
    window.location.href = `/invoices/${result.invoiceId}`;
  }

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
    return total;
  })();
  const manualTotal = isFixedProject ? 0 : manualItems.reduce((s, m) => {
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
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              {isFixedProject ? "Tasks completed (select to include — no time/price shown to client)" : "Logs to include (grouped by task in invoice)"}
            </p>
            {loading ? (
              <p className="text-sm text-[var(--text-muted)]">Loading…</p>
            ) : logs.length === 0 && projectId ? (
              <p className="text-sm text-[var(--text-muted)]">
                No unbilled logs for this project.
              </p>
            ) : (
              <div className="space-y-0 divide-y divide-[var(--border)]">
                {groupedLogs.map((group) => {
                  const allSelected = group.logIds.every((id) => selected.has(id));
                  return (
                    <label
                      key={group.key}
                      className="flex items-center gap-3 py-3 cursor-pointer hover:bg-[var(--bg-card)]/50 px-1 -mx-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleGroup(group.logIds)}
                        className="w-[18px] h-[18px] rounded border-[var(--border)] accent-accent"
                      />
                      <span className="flex-1 text-sm flex items-center gap-2">
                        <span className="text-[var(--text-primary)] font-medium">
                          {group.taskName}
                        </span>
                        {group.serviceName && (
                          <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            {group.serviceName}
                          </span>
                        )}
                      </span>
                      {!isFixedProject && (
                        <span className="font-mono text-xs text-[var(--text-secondary)]">
                          {(group.totalMins / 60).toFixed(1)}h · ${group.totalAmount.toFixed(2)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
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
                {manualItems.map((m) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-[1fr_60px_90px_auto] gap-2 items-center"
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
                      onChange={(e) => updateManualItem(m.id, "quantity", e.target.value)}
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
          )}
          {(selected.size > 0 || manualItems.length > 0) && (
            <div className="rounded-lg border-2 border-accent/50 bg-accent/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Live total</p>
              <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                ${totalAmount.toFixed(2)}
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
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="p-5 border-t border-[var(--border)] flex items-center justify-between gap-4 flex-wrap">
          {(selected.size > 0 || manualItems.length > 0) && (
            <p className="font-mono text-lg font-bold text-[var(--text-primary)]">
              Total: ${totalAmount.toFixed(2)}
            </p>
          )}
          <div className="flex gap-3 ml-auto">
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
      </div>
    </SlideOver>
  );
}
