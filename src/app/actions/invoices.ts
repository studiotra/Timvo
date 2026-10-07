"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  addDaysToDateString,
  isOverdueByDate,
  localToday,
  resolveTimezone,
} from "@/lib/dates";
import { allocateInvoiceNumber, peekNextInvoiceNumber } from "@/lib/invoices/allocate-number";
import {
  computeInvoiceMoney,
  isZeroMoneyTotal,
  lineAmount,
  parseTaxRateInput,
  resolveDisplayMoney,
  resolveTaxRate,
  roundCents,
} from "@/lib/invoices/money";
import { DEFAULT_INVOICE_PREFIX, normalizeInvoicePrefix } from "@/lib/invoices/number";
import { resolveHourlyRate } from "@/lib/rates";
import { fetchUserTimezone } from "@/lib/user-timezone";

export type DefaultInvoiceSettings = {
  default_footer: string | null;
  default_terms: string | null;
  default_due_days: number;
  timezone: string;
  default_tax_rate: number | null;
  invoice_prefix: string;
  next_invoice_number: number | null;
};

export async function getDefaultInvoiceSettings(): Promise<DefaultInvoiceSettings> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      default_footer: null,
      default_terms: null,
      default_due_days: 30,
      timezone: "America/New_York",
      default_tax_rate: null,
      invoice_prefix: DEFAULT_INVOICE_PREFIX,
      next_invoice_number: 1,
    };
  }

  const { data } = await supabase
    .from("profiles")
    .select(
      "default_invoice_footer, default_invoice_terms, default_due_days, timezone, tax_rate, invoice_prefix"
    )
    .eq("id", user.id)
    .single();

  const nextNumber = await peekNextInvoiceNumber(supabase, user.id);

  return {
    default_footer: data?.default_invoice_footer ?? null,
    default_terms: data?.default_invoice_terms ?? null,
    default_due_days: data?.default_due_days ?? 30,
    timezone: resolveTimezone(data?.timezone),
    default_tax_rate: resolveTaxRate(null, data?.tax_rate),
    invoice_prefix: normalizeInvoicePrefix(
      (data as { invoice_prefix?: string | null } | null)?.invoice_prefix
    ),
    next_invoice_number: nextNumber,
  };
}

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const clientId = formData.get("client_id") as string;
  const projectId = formData.get("project_id") as string;
  const issuedAtRaw = (formData.get("issued_at") as string)?.trim() || null;
  const dueAt = (formData.get("due_at") as string)?.trim();
  const footer = (formData.get("footer") as string)?.trim() || null;
  const terms = (formData.get("terms_and_conditions") as string)?.trim() || null;
  const groupByTask = (formData.get("group_by_task") as string) !== "false";
  const logIds = JSON.parse((formData.get("log_ids") as string) || "[]") as string[];
  const polishedDescriptions = JSON.parse(
    (formData.get("polished_descriptions") as string) || "{}"
  ) as Record<string, string>;
  const manualItems = JSON.parse(
    (formData.get("manual_items") as string) || "[]"
  ) as { description: string; quantity: number; unit_rate: number; amount?: number }[];
  const formTaxRate = parseTaxRateInput(formData.get("tax_rate") as string);

  if (!clientId || !projectId) return { error: "Client and project required" };
  const hasLogs = logIds.length > 0;
  const hasManual =
    manualItems.length > 0 &&
    manualItems.every(
      (m) =>
        m.description?.trim() &&
        Number.isFinite(Number(m.quantity)) &&
        Number.isFinite(Number(m.unit_rate))
    );
  if (!hasLogs && !hasManual) return { error: "Add at least one log or manual line item." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, billing_type, agreed_fee, tax_rate, hourly_rate")
    .eq("id", projectId)
    .eq("client_id", clientId)
    .single();
  if (!project) return { error: "Project not found" };
  const isFixedProject = project.billing_type === "fixed" && project.agreed_fee != null && Number(project.agreed_fee) > 0;
  const fixedPrice = isFixedProject ? Number(project.agreed_fee) : 0;
  const projectRate =
    project.hourly_rate != null ? Number(project.hourly_rate) : null;

  const { data: client } = await supabase
    .from("clients")
    .select("currency")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();
  if (!client) return { error: "Client not found" };

  const items: { time_log_ids: string[]; description: string; quantity: number; unit_rate: number; amount: number }[] = [];

  if (logIds.length > 0) {
    let logQuery = supabase
      .from("time_logs")
      .select("id, duration_minutes, description, task_id, task:task_id(name)")
      .eq("user_id", user.id)
      .eq("is_billed", false)
      .in("id", logIds)
      .eq("project_id", projectId);
    if (!isFixedProject) {
      logQuery = logQuery.eq("is_billable", true);
    }
    const { data: logs } = await logQuery;

    if (!logs || logs.length === 0) return { error: "No valid unbilled logs" };

    if (isFixedProject) {
      const taskNames = new Map<string, string[]>();
      for (const log of logs) {
        const task = log.task as { name?: string } | null;
        const name = polishedDescriptions[log.id] ?? task?.name ?? log.description ?? "Work completed";
        const arr = taskNames.get(name) ?? [];
        arr.push(log.id);
        taskNames.set(name, arr);
      }
      for (const [taskName, ids] of taskNames) {
        items.push({
          time_log_ids: ids,
          description: taskName,
          quantity: 1,
          unit_rate: 0,
          amount: 0,
        });
      }
      items.push({
        time_log_ids: [],
        description: `${project.name} — Fixed price`,
        quantity: 1,
        unit_rate: fixedPrice,
        amount: fixedPrice,
      });
    } else {
    const taskIds = [...new Set(logs.map((l) => l.task_id).filter(Boolean))] as string[];
    const tasksWithService: Record<string, string | null> = {};
    if (taskIds.length > 0) {
      const { data: taskRows } = await supabase
        .from("tasks")
        .select("id, service_id")
        .in("id", taskIds);
      for (const t of taskRows ?? []) tasksWithService[t.id] = t.service_id ?? null;
    }
    const serviceIds = [...new Set(Object.values(tasksWithService).filter(Boolean))] as string[];
    const servicesMap: Record<string, { name: string; default_rate: number; billing_type: string }> = {};
    if (serviceIds.length > 0) {
      const { data: svcData } = await supabase
        .from("services")
        .select("id, name, default_rate, billing_type")
        .in("id", serviceIds);
      for (const s of svcData ?? []) {
        servicesMap[s.id] = {
          name: s.name,
          default_rate: Number(s.default_rate) || 0,
          billing_type: s.billing_type ?? "hourly",
        };
      }
    }

    type LogEntry = { id: string; mins: number; taskName: string; serviceId: string | null };
    const byService = new Map<string, LogEntry[]>();

    for (const log of logs) {
      const task = log.task as { name?: string } | null;
      const mins = log.duration_minutes ?? 0;
      const taskName = polishedDescriptions[log.id] ?? task?.name ?? log.description ?? "Time";
      const serviceId = log.task_id ? (tasksWithService[log.task_id] ?? null) : null;

      const entry: LogEntry = { id: log.id, mins, taskName, serviceId };
      if (serviceId && groupByTask) {
        const arr = byService.get(serviceId) ?? [];
        arr.push(entry);
        byService.set(serviceId, arr);
      } else if (serviceId && !groupByTask) {
        // One line per log; still use service rate when linked
        const svc = servicesMap[serviceId];
        const isFixed = svc?.billing_type === "fixed";
        const serviceRate = svc?.default_rate ?? 0;
        const rate = isFixed
          ? serviceRate
          : resolveHourlyRate({ projectRate, serviceRate }).rate;
        if (isFixed && rate > 0) {
          // Flat fee once per service across selected logs — defer to group pass
          const arr = byService.get(serviceId) ?? [];
          arr.push(entry);
          byService.set(serviceId, arr);
        } else {
          const hours = roundCents(mins / 60);
          items.push({
            time_log_ids: [log.id],
            description: taskName,
            quantity: hours,
            unit_rate: rate,
            amount: lineAmount(hours, rate),
          });
        }
      } else {
        const resolved = resolveHourlyRate({ projectRate });
        const hours = roundCents(mins / 60);
        items.push({
          time_log_ids: [log.id],
          description: taskName,
          quantity: hours,
          unit_rate: resolved.rate,
          amount: lineAmount(hours, resolved.rate),
        });
      }
    }

    for (const [svcId, entries] of byService) {
      const svc = servicesMap[svcId];
      const isFixed = svc?.billing_type === "fixed";
      const serviceRate = svc?.default_rate ?? 0;
      // Fixed services always bill the service flat fee; hourly uses project → service.
      const rate = isFixed
        ? serviceRate
        : resolveHourlyRate({
            projectRate,
            serviceRate,
          }).rate;
      const allIds = entries.map((e) => e.id);

      if (isFixed && rate > 0) {
        items.push({
          time_log_ids: allIds,
          description: svc?.name ?? "Service",
          quantity: 1,
          unit_rate: rate,
          amount: roundCents(rate),
        });
        if (groupByTask) {
          const byTask = new Map<string, { ids: string[]; mins: number }>();
          for (const e of entries) {
            const k = e.taskName;
            const x = byTask.get(k) ?? { ids: [], mins: 0 };
            x.ids.push(e.id);
            x.mins += e.mins;
            byTask.set(k, x);
          }
          for (const [taskName, g] of byTask) {
            const hours = roundCents(g.mins / 60);
            items.push({
              time_log_ids: g.ids,
              description: `  ${taskName}`,
              quantity: hours,
              unit_rate: 0,
              amount: 0,
            });
          }
        } else {
          for (const e of entries) {
            const hours = roundCents(e.mins / 60);
            items.push({
              time_log_ids: [e.id],
              description: `  ${e.taskName}`,
              quantity: hours,
              unit_rate: 0,
              amount: 0,
            });
          }
        }
      } else if (groupByTask) {
        const byTask = new Map<string, { ids: string[]; mins: number }>();
        for (const e of entries) {
          const k = e.taskName;
          const x = byTask.get(k) ?? { ids: [], mins: 0 };
          x.ids.push(e.id);
          x.mins += e.mins;
          byTask.set(k, x);
        }
        for (const [taskName, g] of byTask) {
          const hours = roundCents(g.mins / 60);
          items.push({
            time_log_ids: g.ids,
            description: taskName,
            quantity: hours,
            unit_rate: rate,
            amount: lineAmount(hours, rate),
          });
        }
      } else {
        for (const e of entries) {
          const hours = roundCents(e.mins / 60);
          items.push({
            time_log_ids: [e.id],
            description: e.taskName,
            quantity: hours,
            unit_rate: rate,
            amount: lineAmount(hours, rate),
          });
        }
      }
    }
    }
  }

  for (const m of manualItems) {
    if (
      !m.description?.trim() ||
      !Number.isFinite(Number(m.quantity)) ||
      !Number.isFinite(Number(m.unit_rate))
    ) {
      continue;
    }
    const quantity = Number(m.quantity);
    const unitRate = Number(m.unit_rate);
    items.push({
      time_log_ids: [],
      description: m.description.trim(),
      quantity,
      unit_rate: unitRate,
      amount: lineAmount(quantity, unitRate),
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_due_days, tax_rate")
    .eq("id", user.id)
    .single();

  const taxRate =
    formTaxRate ?? resolveTaxRate(project.tax_rate, profile?.tax_rate);
  const money = computeInvoiceMoney(items, taxRate);
  const timezone = await fetchUserTimezone(supabase, user.id);
  const today = localToday(timezone);
  const issuedDate =
    issuedAtRaw && /^\d{4}-\d{2}-\d{2}$/.test(issuedAtRaw) ? issuedAtRaw : today;
  let dueDate: string;
  if (dueAt) {
    dueDate = dueAt;
  } else {
    const days = profile?.default_due_days ?? 30;
    dueDate = addDaysToDateString(issuedDate, days);
  }

  const invoiceNumber = await allocateInvoiceNumber(supabase, user.id);
  // Create & Lock: lock log-sourced lines so edit cannot change billed time
  const insertRow: Record<string, unknown> = {
    client_id: clientId,
    project_id: projectId,
    user_id: user.id,
    status: "draft",
    total_amount: money.total,
    currency: client.currency ?? "USD",
    issued_at: issuedDate,
    due_at: dueDate,
    footer,
    terms_and_conditions: terms,
  };
  if (invoiceNumber != null) {
    insertRow.invoice_number = invoiceNumber;
  }
  insertRow.is_locked = true;

  let inv: { id: string } | null = null;
  let invErr: { message: string } | null = null;

  {
    const result = await supabase
      .from("invoices")
      .insert(insertRow)
      .select("id")
      .single();
    inv = result.data;
    invErr = result.error;
  }

  // Retry without optional columns if migration not applied yet
  if (invErr && (invoiceNumber != null || insertRow.is_locked)) {
    delete insertRow.invoice_number;
    delete insertRow.is_locked;
    const result = await supabase
      .from("invoices")
      .insert(insertRow)
      .select("id")
      .single();
    inv = result.data;
    invErr = result.error;
  }

  if (invErr) return { error: invErr.message };
  if (!inv) return { error: "Failed to create invoice" };

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await supabase.from("invoice_items").insert({
      invoice_id: inv.id,
      time_log_id: it.time_log_ids?.length ? it.time_log_ids[0] : null,
      description: it.description,
      quantity: it.quantity,
      unit_rate: it.unit_rate,
      amount: it.amount,
      sort_order: i,
    });
  }

  if (logIds.length > 0) {
    await supabase
      .from("time_logs")
      .update({ is_billed: true, billed_invoice_id: inv.id })
      .in("id", logIds)
      .eq("user_id", user.id);
  }

  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${inv.id}`);
  return { success: true, invoiceId: inv.id };
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const valid = ["draft", "sent", "paid", "overdue"].includes(status);
  if (!valid) return { error: "Invalid status" };

  const { data: existing } = await supabase
    .from("invoices")
    .select("id, total_amount, project_id, due_at, status, paid_at")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();
  if (!existing) return { error: "Invoice not found" };

  const { data: items } = await supabase
    .from("invoice_items")
    .select("quantity, unit_rate, amount")
    .eq("invoice_id", invoiceId);

  let projectTax: number | null = null;
  if (existing.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("tax_rate")
      .eq("id", existing.project_id)
      .maybeSingle();
    projectTax = project?.tax_rate != null ? Number(project.tax_rate) : null;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("tax_rate, timezone")
    .eq("id", user.id)
    .maybeSingle();

  const taxRate = resolveTaxRate(projectTax, profile?.tax_rate);
  // Upgrade legacy pre-tax totals; keep a custom stored total when present
  const money = resolveDisplayMoney(items ?? [], existing.total_amount, taxRate);
  const timezone = resolveTimezone(profile?.timezone);

  if (status === "overdue" && isZeroMoneyTotal(money.total)) {
    return { error: "A $0 invoice cannot be marked overdue." };
  }
  if (status === "overdue" && existing.due_at) {
    if (!isOverdueByDate(existing.due_at, timezone)) {
      return { error: "Cannot mark overdue while the due date is still in the future." };
    }
  }

  const dbStatus = status === "overdue" ? "overdue" : status;
  const updates: Record<string, string | number | null> = {
    status: dbStatus,
    // Keep total tax-inclusive so status changes never drop tax
    total_amount: money.total,
    updated_at: new Date().toISOString(),
  };
  if (status === "paid") {
    updates.paid_at = new Date().toISOString();
  } else if (existing.status === "paid" || existing.paid_at) {
    // Leaving Paid clears the paid date
    updates.paid_at = null;
  }

  const { error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/");
  revalidatePath("/reports");
  return { success: true };
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // DB trigger also clears time_logs by billed_invoice_id when the invoice row
  // is deleted (covers all logs, not only invoice_items.time_log_id).
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/invoices");
  return { success: true };
}

export async function updateInvoice(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const invoiceId = formData.get("invoice_id") as string;
  const status = (formData.get("status") as string) || "draft";
  const issuedAt = (formData.get("issued_at") as string)?.trim() || null;
  const dueAt = (formData.get("due_at") as string)?.trim() || null;
  const footer = (formData.get("footer") as string)?.trim() || null;
  const terms = (formData.get("terms_and_conditions") as string)?.trim() || null;
  const formTaxRate = parseTaxRateInput(formData.get("tax_rate") as string);
  const manualItems = JSON.parse(
    (formData.get("manual_items") as string) || "[]"
  ) as { id?: string; description: string; quantity: number; unit_rate: number; amount?: number }[];

  if (!invoiceId) return { error: "Invoice ID required" };

  const { data: inv } = await supabase
    .from("invoices")
    .select("id, project_id, total_amount, status, paid_at, is_locked")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!inv) return { error: "Invoice not found" };

  // Create & Lock: any line tied to a time log is read-only (is_locked is optional metadata).
  const { data: existing } = await supabase
    .from("invoice_items")
    .select("id, time_log_id, description, quantity, unit_rate, amount")
    .eq("invoice_id", invoiceId);

  const existingById = new Map((existing ?? []).map((e) => [e.id, e]));
  const lockedLogItemIds = new Set(
    (existing ?? []).filter((e) => !!e.time_log_id).map((e) => e.id)
  );

  const items = manualItems
    .filter(
      (m) =>
        m.description?.trim() &&
        Number.isFinite(Number(m.quantity)) &&
        Number.isFinite(Number(m.unit_rate))
    )
    .map((m) => {
      // Preserve locked log-sourced lines exactly as stored
      if (m.id && lockedLogItemIds.has(m.id)) {
        const orig = existingById.get(m.id)!;
        return {
          id: m.id,
          description: orig.description ?? m.description.trim(),
          quantity: Number(orig.quantity),
          unit_rate: Number(orig.unit_rate),
          amount: Number(orig.amount),
          locked: true as const,
        };
      }
      const quantity = Number(m.quantity);
      const unit_rate = Number(m.unit_rate);
      return {
        id: m.id,
        description: m.description.trim(),
        quantity,
        unit_rate,
        amount: lineAmount(quantity, unit_rate),
        locked: false as const,
      };
    });

  if (items.length === 0) {
    return { error: "Add at least one line item." };
  }

  // Log-sourced lines cannot be removed (Create & Lock)
  for (const id of lockedLogItemIds) {
    if (!items.some((i) => i.id === id)) {
      return { error: "Lines from time logs are locked and cannot be removed." };
    }
  }

  let projectTax: number | null = null;
  if (inv.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("tax_rate")
      .eq("id", inv.project_id)
      .maybeSingle();
    projectTax = project?.tax_rate != null ? Number(project.tax_rate) : null;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("tax_rate, timezone")
    .eq("id", user.id)
    .maybeSingle();

  const taxRate = formTaxRate ?? resolveTaxRate(projectTax, profile?.tax_rate);
  const money = computeInvoiceMoney(items, taxRate);
  const timezone = resolveTimezone(profile?.timezone);

  if (status === "overdue" && isZeroMoneyTotal(money.total)) {
    return { error: "A $0 invoice cannot be marked overdue." };
  }
  if (status === "overdue" && dueAt && !isOverdueByDate(dueAt, timezone)) {
    return { error: "Cannot mark overdue while the due date is still in the future." };
  }

  const invUpdates: Record<string, string | number | null> = {
    status,
    issued_at: issuedAt,
    due_at: dueAt,
    footer,
    terms_and_conditions: terms,
    total_amount: money.total,
    updated_at: new Date().toISOString(),
  };
  if (status === "paid") {
    invUpdates.paid_at = new Date().toISOString();
  } else if (inv.status === "paid" || inv.paid_at) {
    invUpdates.paid_at = null;
  }

  const { error: invErr } = await supabase
    .from("invoices")
    .update(invUpdates)
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (invErr) return { error: invErr.message };

  const existingIds = new Set((existing ?? []).map((e) => e.id));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.id && existingIds.has(item.id)) {
      if (item.locked) {
        await supabase
          .from("invoice_items")
          .update({ sort_order: i })
          .eq("id", item.id);
      } else {
        await supabase
          .from("invoice_items")
          .update({
            description: item.description,
            quantity: item.quantity,
            unit_rate: item.unit_rate,
            amount: item.amount,
            sort_order: i,
          })
          .eq("id", item.id);
      }
    } else {
      await supabase.from("invoice_items").insert({
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_rate: item.unit_rate,
        amount: item.amount,
        sort_order: i,
      });
    }
  }

  const keptIds = new Set(items.filter((i) => i.id).map((i) => i.id!));
  const toDelete = (existing ?? []).filter((e) => !keptIds.has(e.id));
  for (const d of toDelete) {
    if (lockedLogItemIds.has(d.id)) continue;
    await supabase.from("invoice_items").delete().eq("id", d.id);
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/");
  revalidatePath("/reports");
  return { success: true };
}
