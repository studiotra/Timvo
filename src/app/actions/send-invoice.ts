"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { generateInvoicePdf } from "@/lib/generate-invoice-pdf";
import { syncInvoiceToQuickBooks } from "@/lib/quickbooks/sync";
import { sendInvoiceEmail } from "@/lib/invoices/email";
import { publicInvoiceUrl } from "@/lib/app-url";
import {
  canAcceptOnlinePayments,
  canUseInvoicePayments,
  createInvoiceCheckoutSession,
  stripeClient,
} from "@/lib/stripe/connect";

type InvoiceBundle = {
  inv: {
    id: string;
    status: string;
    total_amount: number | null;
    currency: string | null;
    issued_at: string | null;
    due_at: string | null;
    footer: string | null;
    terms_and_conditions: string | null;
    client_id: string;
    project_id: string | null;
    view_token: string | null;
    clients: { name?: string; email?: string } | null;
    projects: { name?: string; tax_rate?: number | null; billing_type?: string } | null;
  };
  items: Array<{ description: string; quantity: number; unit_rate: number; amount: number }>;
  profile: {
    business_name: string | null;
    full_name: string | null;
    phone_number: string | null;
    address: string | null;
    tax_rate: number | null;
    stripe_account_id: string | null;
    stripe_connect_charges_enabled: boolean | null;
    subscription_tier: string | null;
  } | null;
};

async function loadInvoiceBundle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invoiceId: string,
  userId: string
): Promise<InvoiceBundle | { error: string }> {
  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "id, status, total_amount, currency, issued_at, due_at, footer, terms_and_conditions, client_id, project_id, view_token, clients(name, email), projects(name, tax_rate, billing_type)"
    )
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (!inv) return { error: "Invoice not found" };

  const { data: items } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit_rate, amount")
    .eq("invoice_id", invoiceId)
    .order("sort_order");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "business_name, full_name, phone_number, address, tax_rate, stripe_account_id, stripe_connect_charges_enabled, subscription_tier"
    )
    .eq("id", userId)
    .single();

  return {
    inv: inv as InvoiceBundle["inv"],
    items: (items ?? []).map((i) => ({
      description: i.description ?? "",
      quantity: Number(i.quantity) ?? 0,
      unit_rate: Number(i.unit_rate) ?? 0,
      amount: Number(i.amount) ?? 0,
    })),
    profile,
  };
}

async function dispatchInvoice(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  bundle: InvoiceBundle;
  regenerateToken: boolean;
  markSent: boolean;
}) {
  const { inv, items, profile } = params.bundle;
  const client = inv.clients;
  const clientEmail = client?.email?.trim();
  if (!clientEmail) return { error: "Client has no email" };

  const project = inv.projects;
  const projectTaxRate =
    project?.tax_rate != null && project.tax_rate > 0 ? Number(project.tax_rate) : null;
  const profileTaxRate =
    profile?.tax_rate != null && profile.tax_rate > 0 ? Number(profile.tax_rate) : null;
  const taxRate = projectTaxRate ?? profileTaxRate;
  const subtotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const taxAmount = taxRate != null ? Math.round(subtotal * (taxRate / 100) * 100) / 100 : 0;
  const totalWithTax = subtotal + taxAmount;
  const isFixedProject = project?.billing_type === "fixed";
  const businessName =
    profile?.business_name?.trim() || profile?.full_name?.trim() || "Your Business";

  const viewToken =
    params.regenerateToken || !inv.view_token
      ? randomBytes(24).toString("hex")
      : inv.view_token;

  let paymentUrl: string | null = null;
  let stripeSessionId: string | null = null;

  const stripe = stripeClient();
  const profileForConnect = profile
    ? {
        stripe_account_id: profile.stripe_account_id,
        stripe_connect_charges_enabled: profile.stripe_connect_charges_enabled,
        stripe_connect_onboarding_complete: null,
        subscription_tier: profile.subscription_tier,
      }
    : null;

  if (
    stripe &&
    canUseInvoicePayments(profileForConnect) &&
    canAcceptOnlinePayments(profileForConnect)
  ) {
    try {
      const session = await createInvoiceCheckoutSession({
        stripe,
        connectedAccountId: profile!.stripe_account_id,
        invoiceId: inv.id,
        currency: inv.currency ?? "USD",
        lineItems: items.map((i) => ({ description: i.description, amount: Number(i.amount) })),
        taxAmount,
        taxLabel: taxRate != null ? `Tax (${taxRate}%)` : undefined,
        totalWithTax,
        clientEmail,
        clientName: client?.name,
        publicInvoiceUrl: publicInvoiceUrl(viewToken),
      });
      paymentUrl = session.url;
      stripeSessionId = session.id;
    } catch (e) {
      console.error("Stripe checkout error:", e);
    }
  }

  // Persist view token BEFORE email so the link works immediately
  const { error: prepError } = await params.supabase
    .from("invoices")
    .update({
      view_token: viewToken,
      stripe_payment_url: paymentUrl,
      stripe_session_id: stripeSessionId,
      total_amount: totalWithTax,
      ...(params.markSent ? { status: "sent" } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", inv.id)
    .eq("user_id", params.userId);

  if (prepError) return { error: prepError.message };

  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateInvoicePdf({
      id: inv.id,
      total_amount: totalWithTax,
      subtotal,
      tax_rate: taxRate ?? undefined,
      tax_amount: taxAmount,
      is_fixed_price: isFixedProject,
      currency: inv.currency ?? "USD",
      issued_at: inv.issued_at,
      due_at: inv.due_at,
      clientName: client?.name ?? "Client",
      clientEmail,
      projectName: project?.name ?? undefined,
      footer: inv.footer,
      terms_and_conditions: inv.terms_and_conditions,
      business: {
        name: businessName,
        phone: profile?.phone_number ?? null,
        address: profile?.address ?? null,
      },
      items,
    });
  } catch (e) {
    console.error("PDF generation error:", e);
  }

  const emailResult = await sendInvoiceEmail({
    to: clientEmail,
    invoiceId: inv.id,
    businessName,
    clientName: client?.name,
    currency: inv.currency ?? "USD",
    totalWithTax,
    viewToken,
    paymentUrl,
    pdfBuffer,
  });

  if (emailResult.error) {
    if (params.markSent) {
      await params.supabase
        .from("invoices")
        .update({ status: "draft", updated_at: new Date().toISOString() })
        .eq("id", inv.id)
        .eq("user_id", params.userId);
    }
    return { error: emailResult.error };
  }

  if (!params.markSent) {
    await params.supabase
      .from("invoices")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", inv.id)
      .eq("user_id", params.userId);
  }

  void syncInvoiceToQuickBooks(params.supabase, inv.id).then((result) => {
    if (!result.ok) console.error("QuickBooks invoice sync:", result.error);
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${inv.id}`);

  return { success: true as const, viewToken };
}

export async function sendInvoice(invoiceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const bundle = await loadInvoiceBundle(supabase, invoiceId, user.id);
  if ("error" in bundle) return bundle;

  if (bundle.inv.status !== "draft") {
    return { error: "Invoice already sent. Use Resend to email again." };
  }

  return dispatchInvoice({
    supabase,
    userId: user.id,
    bundle,
    regenerateToken: true,
    markSent: false,
  });
}

export async function resendInvoice(invoiceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const bundle = await loadInvoiceBundle(supabase, invoiceId, user.id);
  if ("error" in bundle) return bundle;

  const status = bundle.inv.status;
  if (status !== "sent" && status !== "overdue") {
    return { error: "Only sent or overdue invoices can be resent." };
  }

  return dispatchInvoice({
    supabase,
    userId: user.id,
    bundle,
    regenerateToken: false,
    markSent: true,
  });
}
