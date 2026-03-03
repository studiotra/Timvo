"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DefaultInvoiceSettings = {
  default_footer: string | null;
  default_terms: string | null;
  default_due_days: number;
};

export async function getDefaultInvoiceSettings(): Promise<DefaultInvoiceSettings> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { default_footer: null, default_terms: null, default_due_days: 30 };

  const { data } = await supabase
    .from("profiles")
    .select("default_invoice_footer, default_invoice_terms, default_due_days")
    .eq("id", user.id)
    .single();

  return {
    default_footer: data?.default_invoice_footer ?? null,
    default_terms: data?.default_invoice_terms ?? null,
    default_due_days: data?.default_due_days ?? 30,
  };
}

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const clientId = formData.get("client_id") as string;
  const projectId = formData.get("project_id") as string;
  const dueAt = (formData.get("due_at") as string)?.trim();
  const footer = (formData.get("footer") as string)?.trim() || null;
  const terms = (formData.get("terms_and_conditions") as string)?.trim() || null;
  const logIds = JSON.parse((formData.get("log_ids") as string) || "[]") as string[];
  const polishedDescriptions = JSON.parse(
    (formData.get("polished_descriptions") as string) || "{}"
  ) as Record<string, string>;
  const manualItems = JSON.parse(
    (formData.get("manual_items") as string) || "[]"
  ) as { description: string; quantity: number; unit_rate: number; amount: number }[];

  if (!clientId || !projectId) return { error: "Client and project required" };
  const hasLogs = logIds.length > 0;
  const hasManual = manualItems.length > 0 && manualItems.every(
    (m) => m.description?.trim() && !isNaN(m.quantity) && !isNaN(m.unit_rate) && !isNaN(m.amount)
  );
  if (!hasLogs && !hasManual) return { error: "Add at least one log or manual line item." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, billing_type, agreed_fee")
    .eq("id", projectId)
    .eq("client_id", clientId)
    .single();
  if (!project) return { error: "Project not found" };
  const isFixedProject = project.billing_type === "fixed" && project.agreed_fee != null && Number(project.agreed_fee) > 0;
  const fixedPrice = isFixedProject ? Number(project.agreed_fee) : 0;

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
      .select("id, duration_minutes, description, task_id, task:task_id(name), projects(hourly_rate)")
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
    const noServiceLogs: LogEntry[] = [];

    for (const log of logs) {
      const task = log.task as { name?: string } | null;
      const mins = log.duration_minutes ?? 0;
      const taskName = polishedDescriptions[log.id] ?? task?.name ?? log.description ?? "Time";
      const serviceId = log.task_id ? (tasksWithService[log.task_id] ?? null) : null;

      const entry: LogEntry = { id: log.id, mins, taskName, serviceId };
      if (serviceId) {
        const arr = byService.get(serviceId) ?? [];
        arr.push(entry);
        byService.set(serviceId, arr);
      } else {
        const projRate = Number((log.projects as { hourly_rate?: number })?.hourly_rate) || 0;
        const hours = mins / 60;
        const amount = Math.round(hours * projRate * 100) / 100;
        items.push({
          time_log_ids: [log.id],
          description: taskName,
          quantity: Math.round(hours * 100) / 100,
          unit_rate: projRate,
          amount,
        });
      }
    }

    const projRateFallback = Number((logs[0]?.projects as { hourly_rate?: number })?.hourly_rate) || 0;

    for (const [svcId, entries] of byService) {
      const svc = servicesMap[svcId];
      const rate = (svc?.default_rate ?? 0) > 0 ? svc!.default_rate : projRateFallback;
      const isFixed = svc?.billing_type === "fixed";
      const totalMins = entries.reduce((s, e) => s + e.mins, 0);
      const allIds = entries.map((e) => e.id);

      if (isFixed && rate > 0) {
        items.push({
          time_log_ids: allIds,
          description: svc?.name ?? "Service",
          quantity: 1,
          unit_rate: rate,
          amount: Math.round(rate * 100) / 100,
        });
        const byTask = new Map<string, { ids: string[]; mins: number }>();
        for (const e of entries) {
          const k = e.taskName;
          const x = byTask.get(k) ?? { ids: [], mins: 0 };
          x.ids.push(e.id);
          x.mins += e.mins;
          byTask.set(k, x);
        }
        for (const [taskName, g] of byTask) {
          const hours = Math.round((g.mins / 60) * 100) / 100;
          items.push({
            time_log_ids: g.ids,
            description: `  ${taskName}`,
            quantity: hours,
            unit_rate: 0,
            amount: 0,
          });
        }
      } else {
        const byTask = new Map<string, { ids: string[]; mins: number }>();
        for (const e of entries) {
          const k = e.taskName;
          const x = byTask.get(k) ?? { ids: [], mins: 0 };
          x.ids.push(e.id);
          x.mins += e.mins;
          byTask.set(k, x);
        }
        for (const [taskName, g] of byTask) {
          const hours = Math.round((g.mins / 60) * 100) / 100;
          const amount = Math.round(hours * rate * 100) / 100;
          items.push({
            time_log_ids: g.ids,
            description: taskName,
            quantity: hours,
            unit_rate: rate,
            amount,
          });
        }
      }
    }
    }
  }

  for (const m of manualItems) {
    if (!m.description?.trim() || isNaN(m.quantity) || isNaN(m.unit_rate) || isNaN(m.amount)) continue;
    const amount = Math.round(m.amount * 100) / 100;
    items.push({
      time_log_ids: [],
      description: m.description.trim(),
      quantity: m.quantity,
      unit_rate: m.unit_rate,
      amount,
    });
  }

  const total = items.reduce((s, i) => s + i.amount, 0);
  const issued = new Date();
  let dueDate: string;
  if (dueAt) {
    dueDate = dueAt;
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_due_days")
      .eq("id", user.id)
      .single();
    const days = profile?.default_due_days ?? 30;
    const due = new Date(issued);
    due.setDate(due.getDate() + days);
    dueDate = due.toISOString().slice(0, 10);
  }

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .insert({
      client_id: clientId,
      project_id: projectId,
      user_id: user.id,
      status: "draft",
      total_amount: Math.round(total * 100) / 100,
      currency: client.currency ?? "USD",
      issued_at: issued.toISOString().slice(0, 10),
      due_at: dueDate,
      footer,
      terms_and_conditions: terms,
    })
    .select("id")
    .single();

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
      .update({ is_billed: true })
      .in("id", logIds);
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
  const dbStatus = status === "overdue" ? "sent" : status;

  const { error } = await supabase
    .from("invoices")
    .update({ status: dbStatus, updated_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { success: true };
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: items } = await supabase
    .from("invoice_items")
    .select("time_log_id")
    .eq("invoice_id", invoiceId)
    .not("time_log_id", "is", null);

  const logIds = (items ?? []).map((i) => i.time_log_id).filter(Boolean);
  if (logIds.length > 0) {
    await supabase
      .from("time_logs")
      .update({ is_billed: false })
      .in("id", logIds)
      .eq("user_id", user.id);
  }

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
  const manualItems = JSON.parse(
    (formData.get("manual_items") as string) || "[]"
  ) as { id?: string; description: string; quantity: number; unit_rate: number; amount: number }[];

  if (!invoiceId) return { error: "Invoice ID required" };

  const { data: inv } = await supabase
    .from("invoices")
    .select("id, total_amount")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!inv) return { error: "Invoice not found" };

  const items = manualItems.filter(
    (m) => m.description?.trim() && !isNaN(m.quantity) && !isNaN(m.unit_rate) && !isNaN(m.amount)
  );
  const total = items.reduce((s, i) => s + i.amount, 0);

  const { error: invErr } = await supabase
    .from("invoices")
    .update({
      status,
      issued_at: issuedAt,
      due_at: dueAt,
      footer,
      terms_and_conditions: terms,
      total_amount: Math.round(total * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (invErr) return { error: invErr.message };

  const { data: existing } = await supabase
    .from("invoice_items")
    .select("id")
    .eq("invoice_id", invoiceId);

  const existingIds = new Set((existing ?? []).map((e) => e.id));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.id && existingIds.has(item.id)) {
      await supabase
        .from("invoice_items")
        .update({
          description: item.description.trim(),
          quantity: item.quantity,
          unit_rate: item.unit_rate,
          amount: item.amount,
          sort_order: i,
        })
        .eq("id", item.id);
    } else {
      await supabase.from("invoice_items").insert({
        invoice_id: invoiceId,
        description: item.description.trim(),
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
    await supabase.from("invoice_items").delete().eq("id", d.id);
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { success: true };
}
