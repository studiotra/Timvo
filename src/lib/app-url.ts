/** Canonical app URL for emails, Stripe redirects, and OAuth callbacks. */
export function getAppBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function publicInvoiceUrl(viewToken: string) {
  return `${getAppBaseUrl()}/invoice/${viewToken}`;
}
