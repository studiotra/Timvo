import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canUseQuickBooks,
  quickbooksApiBase,
  quickbooksEnvironment,
  refreshAccessToken,
  tokensFromResponse,
  type StoredConnection,
} from "./oauth";

type QueryResult<T> = {
  QueryResponse?: T;
  Invoice?: { Id: string; SyncToken: string };
  Customer?: { Id: string; SyncToken?: string; DisplayName?: string };
  Payment?: { Id: string };
  Fault?: { Error?: Array<{ Message?: string; Detail?: string }> };
};

async function getValidConnection(userId: string): Promise<StoredConnection | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("quickbooks_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  const expiresAt = new Date(data.access_token_expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) {
    return data as StoredConnection;
  }

  try {
    const refreshed = await refreshAccessToken(data.refresh_token);
    const tokenFields = tokensFromResponse(refreshed);
    const updated = {
      ...tokenFields,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("quickbooks_connections").update(updated).eq("user_id", userId);
    return { ...data, ...tokenFields } as StoredConnection;
  } catch (e) {
    console.error("QuickBooks token refresh failed:", e);
    return null;
  }
}

async function qboFetch<T>(
  conn: StoredConnection,
  path: string,
  init?: RequestInit
): Promise<T> {
  const base = quickbooksApiBase();
  const url = `${base}/v3/company/${conn.realm_id}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${conn.access_token}`,
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json()) as T & QueryResult<unknown>;
  if (!res.ok) {
    const fault = json.Fault?.Error?.[0];
    throw new Error(
      fault?.Detail || fault?.Message || `QuickBooks API error ${res.status}`
    );
  }
  return json;
}

async function qboQuery<T>(conn: StoredConnection, query: string) {
  const encoded = encodeURIComponent(query);
  return qboFetch<QueryResult<T>>(conn, `/query?query=${encoded}`, { method: "GET" });
}

async function getCompanyName(conn: StoredConnection) {
  try {
    const data = await qboFetch<{ CompanyInfo?: { CompanyName?: string } }>(
      conn,
      "/companyinfo/" + conn.realm_id,
      { method: "GET" }
    );
    return data.CompanyInfo?.CompanyName ?? null;
  } catch {
    return null;
  }
}

async function findDepositAccountId(conn: StoredConnection): Promise<string | null> {
  const undeposited = await qboQuery<{ Account?: Array<{ Id: string }> }>(
    conn,
    "SELECT Id FROM Account WHERE Name = 'Undeposited Funds' MAXRESULTS 1"
  );
  const id = undeposited.QueryResponse?.Account?.[0]?.Id;
  if (id) return id;

  const bank = await qboQuery<{ Account?: Array<{ Id: string }> }>(
    conn,
    "SELECT Id FROM Account WHERE AccountType = 'Bank' MAXRESULTS 1"
  );
  return bank.QueryResponse?.Account?.[0]?.Id ?? null;
}

export async function ensureQuickBooksCustomer(
  supabase: SupabaseClient,
  userId: string,
  client: { id: string; name: string; email?: string | null; quickbooks_customer_id?: string | null }
): Promise<string | null> {
  if (client.quickbooks_customer_id) return client.quickbooks_customer_id;

  const conn = await getValidConnection(userId);
  if (!conn) return null;

  const payload = {
    DisplayName: client.name,
    ...(client.email?.trim() ? { PrimaryEmailAddr: { Address: client.email.trim() } } : {}),
  };

  const created = await qboFetch<{ Customer?: { Id: string } }>(conn, "/customer", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const customerId = created.Customer?.Id;
  if (!customerId) return null;

  await supabase
    .from("clients")
    .update({ quickbooks_customer_id: customerId, updated_at: new Date().toISOString() })
    .eq("id", client.id)
    .eq("user_id", userId);

  return customerId;
}

type InvoiceItem = {
  description: string;
  quantity: number;
  unit_rate: number;
  amount: number;
};

export async function syncInvoiceToQuickBooks(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "id, user_id, status, total_amount, currency, issued_at, due_at, quickbooks_invoice_id, quickbooks_sync_token, client_id, clients(id, name, email, quickbooks_customer_id)"
    )
    .eq("id", invoiceId)
    .single();

  if (!inv) return { ok: false, error: "Invoice not found" };
  if (inv.quickbooks_invoice_id) return { ok: true };

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", inv.user_id)
    .single();
  if (!canUseQuickBooks(profile)) return { ok: true };

  const conn = await getValidConnection(inv.user_id);
  if (!conn) return { ok: true };

  const clientRaw = inv.clients as unknown as {
    id: string;
    name: string;
    email?: string | null;
    quickbooks_customer_id?: string | null;
  } | null;
  if (!clientRaw?.name) return { ok: false, error: "Client missing" };

  const customerId = await ensureQuickBooksCustomer(supabase, inv.user_id, {
    id: clientRaw.id,
    name: clientRaw.name,
    email: clientRaw.email,
    quickbooks_customer_id: clientRaw.quickbooks_customer_id,
  });
  if (!customerId) return { ok: false, error: "Could not create QuickBooks customer" };

  const { data: items } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit_rate, amount")
    .eq("invoice_id", invoiceId)
    .order("sort_order");

  const lineItems = (items ?? []) as InvoiceItem[];
  const total = Number(inv.total_amount) || lineItems.reduce((s, i) => s + Number(i.amount), 0);

  const lines =
    lineItems.length > 0
      ? lineItems.map((item) => ({
          Amount: Number(item.amount) || 0,
          DetailType: "SalesItemLineDetail",
          Description: item.description,
          SalesItemLineDetail: {
            Qty: Number(item.quantity) || 1,
            UnitPrice: Number(item.unit_rate) || Number(item.amount) || 0,
          },
        }))
      : [
          {
            Amount: total,
            DetailType: "SalesItemLineDetail",
            Description: `Invoice ${invoiceId.slice(0, 8)}`,
            SalesItemLineDetail: {
              Qty: 1,
              UnitPrice: total,
            },
          },
        ];

  const payload = {
    CustomerRef: { value: customerId },
    TxnDate: inv.issued_at ?? new Date().toISOString().slice(0, 10),
    DueDate: inv.due_at ?? undefined,
    DocNumber: invoiceId.slice(0, 8).toUpperCase(),
    PrivateNote: `Timvo invoice ${invoiceId}`,
    Line: lines,
  };

  try {
    const created = await qboFetch<{ Invoice?: { Id: string; SyncToken: string } }>(
      conn,
      "/invoice",
      { method: "POST", body: JSON.stringify(payload) }
    );

    const qbInvoice = created.Invoice;
    if (!qbInvoice?.Id) return { ok: false, error: "QuickBooks invoice not returned" };

    await supabase
      .from("invoices")
      .update({
        quickbooks_invoice_id: qbInvoice.Id,
        quickbooks_sync_token: qbInvoice.SyncToken,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "QuickBooks sync failed";
    console.error("syncInvoiceToQuickBooks:", message);
    return { ok: false, error: message };
  }
}

export async function syncStripePaymentToQuickBooks(
  supabase: SupabaseClient,
  invoiceId: string,
  options?: { amount?: number; paidAt?: string; stripeSessionId?: string }
): Promise<{ ok: boolean; error?: string }> {
  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "id, user_id, total_amount, quickbooks_invoice_id, quickbooks_payment_id, client_id, clients(id, name, email, quickbooks_customer_id)"
    )
    .eq("id", invoiceId)
    .single();

  if (!inv) return { ok: false, error: "Invoice not found" };
  if (inv.quickbooks_payment_id) return { ok: true };

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", inv.user_id)
    .single();
  if (!canUseQuickBooks(profile)) return { ok: true };

  const conn = await getValidConnection(inv.user_id);
  if (!conn) return { ok: true };

  if (!inv.quickbooks_invoice_id) {
    const synced = await syncInvoiceToQuickBooks(supabase, invoiceId);
    if (!synced.ok) return synced;
    const { data: refreshed } = await supabase
      .from("invoices")
      .select("quickbooks_invoice_id")
      .eq("id", invoiceId)
      .single();
    if (!refreshed?.quickbooks_invoice_id) {
      return { ok: false, error: "QuickBooks invoice missing after sync" };
    }
    inv.quickbooks_invoice_id = refreshed.quickbooks_invoice_id;
  }

  const clientRaw = inv.clients as unknown as {
    id: string;
    name: string;
    email?: string | null;
    quickbooks_customer_id?: string | null;
  } | null;
  if (!clientRaw?.name) return { ok: false, error: "Client missing" };

  const customerId = await ensureQuickBooksCustomer(supabase, inv.user_id, clientRaw);
  if (!customerId) return { ok: false, error: "QuickBooks customer missing" };

  const amount = options?.amount ?? Number(inv.total_amount);
  if (!amount || amount <= 0) return { ok: false, error: "Invalid payment amount" };

  const depositAccountId = await findDepositAccountId(conn);
  const txnDate = (options?.paidAt ?? new Date().toISOString()).slice(0, 10);

  const payload = {
    CustomerRef: { value: customerId },
    TotalAmt: amount,
    TxnDate: txnDate,
    PrivateNote: options?.stripeSessionId
      ? `Stripe Checkout ${options.stripeSessionId}`
      : `Timvo Stripe payment for invoice ${invoiceId}`,
    ...(depositAccountId ? { DepositToAccountRef: { value: depositAccountId } } : {}),
    Line: [
      {
        Amount: amount,
        LinkedTxn: [
          {
            TxnId: inv.quickbooks_invoice_id,
            TxnType: "Invoice",
          },
        ],
      },
    ],
  };

  try {
    const created = await qboFetch<{ Payment?: { Id: string } }>(conn, "/payment", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const paymentId = created.Payment?.Id;
    if (!paymentId) return { ok: false, error: "QuickBooks payment not returned" };

    await supabase
      .from("invoices")
      .update({
        quickbooks_payment_id: paymentId,
        paid_at: options?.paidAt ?? new Date().toISOString(),
        ...(options?.stripeSessionId ? { stripe_session_id: options.stripeSessionId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "QuickBooks payment sync failed";
    console.error("syncStripePaymentToQuickBooks:", message);
    return { ok: false, error: message };
  }
}

export { getCompanyName, getValidConnection, quickbooksEnvironment };
