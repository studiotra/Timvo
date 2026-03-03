"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import Stripe from "stripe";
import { randomBytes } from "crypto";
import { generateInvoicePdf } from "@/lib/generate-invoice-pdf";

export async function sendInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: inv } = await supabase
    .from("invoices")
    .select("id, status, total_amount, currency, issued_at, due_at, footer, terms_and_conditions, client_id, project_id, clients(name, email), projects(name, tax_rate, billing_type)")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!inv) return { error: "Invoice not found" };
  if (inv.status !== "draft") return { error: "Invoice already sent" };

  const { data: items } = await supabase
    .from("invoice_items")
    .select("description, quantity, unit_rate, amount")
    .eq("invoice_id", invoiceId)
    .order("sort_order");

  const client = inv.clients as unknown as { name?: string; email?: string } | null;
  const clientEmail = client?.email;

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name, full_name, phone_number, address, tax_rate")
    .eq("id", user.id)
    .single();

  const project = inv?.projects as unknown as { name?: string; tax_rate?: number | null } | null;
  const projectTaxRate = project?.tax_rate != null && project.tax_rate > 0 ? Number(project.tax_rate) : null;
  const profileTaxRate = profile?.tax_rate != null && profile.tax_rate > 0 ? Number(profile.tax_rate) : null;
  const taxRate = projectTaxRate ?? profileTaxRate;
  const subtotal = (items ?? []).reduce((s, i) => s + Number(i.amount || 0), 0);
  const taxAmount = taxRate != null ? Math.round(subtotal * (taxRate / 100) * 100) / 100 : 0;
  const totalWithTax = subtotal + taxAmount;
  const isFixedProject = (project as { billing_type?: string })?.billing_type === "fixed";
  const businessName = profile?.business_name?.trim() || profile?.full_name?.trim() || "Your Business";
  const business = {
    name: businessName,
    phone: profile?.phone_number ?? null,
    address: profile?.address ?? null,
  };
  if (!clientEmail?.trim()) return { error: "Client has no email" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const viewToken = randomBytes(24).toString("hex");
  const publicInvoiceUrl = `${baseUrl}/invoice/${viewToken}`;

  let paymentUrl: string | null = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey?.trim()) {
    try {
      const stripe = new Stripe(stripeKey);
      const currency = (inv.currency ?? "USD").toLowerCase();
      // Stripe uses smallest unit (cents for USD)
      const toCents = (n: number) => Math.round(n * 100);

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
        (items ?? []).length > 0
          ? [
              ...(items ?? []).map((i) => ({
                price_data: {
                  currency,
                  unit_amount: toCents(Number(i.amount) || 0),
                  product_data: {
                    name: i.description ?? "Line item",
                  },
                },
                quantity: 1,
              })),
              ...(taxAmount > 0
                ? [
                    {
                      price_data: {
                        currency,
                        unit_amount: toCents(taxAmount),
                        product_data: {
                          name: `Tax (${taxRate}%)`,
                        },
                      },
                      quantity: 1,
                    },
                  ]
                : []),
            ]
          : [
              {
                price_data: {
                  currency,
                  unit_amount: toCents(totalWithTax),
                  product_data: {
                    name: `Invoice #${invoiceId.slice(0, 8)} — ${client?.name ?? "Invoice"}`,
                  },
                },
                quantity: 1,
              },
            ];

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        metadata: { invoice_id: invoiceId },
        success_url: `${publicInvoiceUrl}?paid=1`,
        cancel_url: publicInvoiceUrl,
        customer_email: clientEmail,
      });
      paymentUrl = session.url;
    } catch (e) {
      console.error("Stripe checkout error:", e);
    }
  }

  // Generate PDF attachment
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
      clientEmail: client?.email ?? undefined,
      projectName: project?.name ?? undefined,
      footer: inv.footer,
      terms_and_conditions: inv.terms_and_conditions,
      business,
      items: (items ?? []).map((i) => ({
        description: i.description ?? "",
        quantity: Number(i.quantity) ?? 0,
        unit_rate: Number(i.unit_rate) ?? 0,
        amount: Number(i.amount) ?? 0,
      })),
    });
  } catch (e) {
    console.error("PDF generation error:", e);
  }

  // Send email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!resendKey?.trim()) {
    return { error: "Email not configured. Add RESEND_API_KEY and EMAIL_FROM to .env.local." };
  }

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: fromEmail,
      to: clientEmail,
      subject: `Invoice #${invoiceId.slice(0, 8)} from ${businessName}`,
      ...(pdfBuffer && {
        attachments: [
          {
            filename: `invoice-${invoiceId.slice(0, 8)}.pdf`,
            content: pdfBuffer,
          },
        ],
      }),
      html: `
        <p>Hi ${client?.name ?? "there"},</p>
        <p>Please find your invoice attached below.</p>
        <p><strong>Amount:</strong> ${inv.currency ?? "USD"} $${totalWithTax.toFixed(2)}</strong></p>
        <p>
          <a href="${publicInvoiceUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;font-weight:600;">View Invoice</a>
        </p>
        ${paymentUrl ? `<p><a href="${paymentUrl}" style="display:inline-block;padding:12px 24px;background:#10b981;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Pay Online</a></p>` : ""}
        <p>— ${businessName}</p>
      `,
    });
  } catch (e) {
    console.error("Resend error:", e);
    return { error: "Failed to send email. Check RESEND_API_KEY." };
  }

  await supabase
    .from("invoices")
    .update({ status: "sent", stripe_payment_url: paymentUrl, view_token: viewToken, total_amount: totalWithTax })
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  return { success: true };
}
