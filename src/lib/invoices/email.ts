import { Resend } from "resend";
import { publicInvoiceUrl } from "@/lib/app-url";

export function buildInvoiceEmailHtml(params: {
  clientName?: string;
  businessName: string;
  currency: string;
  totalWithTax: number;
  viewToken: string;
  paymentUrl: string | null;
}) {
  const invoiceUrl = publicInvoiceUrl(params.viewToken);
  const amount = `${params.currency} $${params.totalWithTax.toFixed(2)}`;

  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; color: #111; line-height: 1.5;">
  <p>Hi ${params.clientName ?? "there"},</p>
  <p>Please find your invoice attached.</p>
  <p><strong>Amount:</strong> ${amount}</p>
  <p style="margin: 24px 0;">
    <a href="${invoiceUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">View Invoice</a>
  </p>
  ${
    params.paymentUrl
      ? `<p style="margin: 16px 0;">
    <a href="${params.paymentUrl}" style="display:inline-block;padding:12px 24px;background:#10b981;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Pay Online</a>
  </p>`
      : ""
  }
  <p style="color:#666;font-size:13px;">Or copy this link: ${invoiceUrl}</p>
  <p>— ${params.businessName}</p>
</body>
</html>`;
}

export async function sendInvoiceEmail(params: {
  to: string;
  invoiceId: string;
  businessName: string;
  clientName?: string;
  currency: string;
  totalWithTax: number;
  viewToken: string;
  paymentUrl: string | null;
  pdfBuffer: Buffer | null;
}) {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  if (!resendKey) {
    return { error: "Email not configured. Add RESEND_API_KEY and EMAIL_FROM to .env.local." };
  }

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: `Invoice #${params.invoiceId.slice(0, 8)} from ${params.businessName}`,
    ...(params.pdfBuffer && {
      attachments: [
        {
          filename: `invoice-${params.invoiceId.slice(0, 8)}.pdf`,
          content: params.pdfBuffer,
        },
      ],
    }),
    html: buildInvoiceEmailHtml({
      clientName: params.clientName,
      businessName: params.businessName,
      currency: params.currency,
      totalWithTax: params.totalWithTax,
      viewToken: params.viewToken,
      paymentUrl: params.paymentUrl,
    }),
  });

  return { success: true as const };
}
