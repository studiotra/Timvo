# Stripe Setup Guide for Timvo

This guide walks you through setting up Stripe so your invoices can be paid online.

---

## What Stripe does in Timvo

1. **Connect Stripe** (Settings) — link your Express account to receive client payments directly.
2. **Send invoice** — creates a Stripe Checkout link on your connected account (Solo/Team plan).
3. **Customer pays** — client pays via Stripe Checkout; webhook marks invoice **Paid** and syncs to QuickBooks if connected.

---

## Step 1: Create a Stripe account

1. Go to [stripe.com](https://stripe.com) and sign up.
2. Complete account verification (Stripe may require business details for live payments).
3. For testing, you can use **Test mode** (toggle in the top-right of the Stripe Dashboard).

---

## Step 2: Get your API keys

1. Stripe Dashboard → **Developers** → **API keys**  
   Direct: [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)

2. In **Test mode** (for development):
   - **Publishable key** – `pk_test_...` (not used by this app)
   - **Secret key** – `sk_test_...` (click **Reveal**)

3. In **Live mode** (for production):
   - Use `sk_live_...` instead of `sk_test_...`

4. Add the secret key to Vercel:
   - Vercel → your project → **Settings** → **Environment Variables**
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_test_...` (or `sk_live_...` for production)
   - Environment: Production (and Preview/Development if needed)

---

## Step 3: Create a webhook endpoint (production)

The webhook is how Stripe tells your app when a payment is completed.

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**  
   Direct: [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)

2. **Endpoint URL**:
   ```
   https://timvo.work/api/webhooks/stripe
   ```
   (Use your production domain: `https://www.timvo.work/api/webhooks/stripe` if that’s your main URL.)

3. **Events to listen for**:
   - `checkout.session.completed`
   - `account.updated` (Stripe Connect status sync)

4. Click **Add endpoint**.

5. On the new endpoint page, click **Reveal** under **Signing secret** and copy the value (`whsec_...`).

6. Add it to Vercel:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...`
   - Environment: Production

7. Redeploy your app (Deployments → ⋮ → Redeploy).

---

## Step 4: Verify the setup

### Test mode

1. Use `sk_test_...` and create a test webhook.
2. Use test card: `4242 4242 4242 4242`.
3. Create an invoice, send it, open the payment link, and pay with the test card.
4. Confirm the invoice status changes to **Paid**.

### Webhook delivery

1. Stripe Dashboard → **Developers** → **Webhooks** → your endpoint
2. Check **Recent deliveries** for success (200) or errors.

---

## Checklist

- [ ] Stripe account created
- [ ] `STRIPE_SECRET_KEY` in Vercel (test or live)
- [ ] Webhook endpoint added: `https://timvo.work/api/webhooks/stripe` (or your domain)
- [ ] Webhook event: `checkout.session.completed`
- [ ] `STRIPE_WEBHOOK_SECRET` in Vercel
- [ ] Redeployed after adding env vars
- [ ] Test payment completes and invoice is marked paid

---

## Switching to live mode

1. In Stripe, complete account activation (business details, etc.).
2. Switch to **Live mode** in the Stripe Dashboard.
3. Create a new webhook endpoint for production (same URL).
4. Update Vercel:
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` → new live webhook secret
5. Redeploy.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Invoice not marked paid after payment | Check webhook deliveries in Stripe. Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint and you redeployed. |
| Webhook returns 400 | Signature verification failed. Confirm the signing secret and that the request body is not modified (raw body). |
| Webhook returns 500 | Check Vercel logs for errors. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set so the webhook can update invoices. |
| Connect Stripe returns 500 | Check Vercel logs. Common causes: Stripe Connect not enabled on your platform account, missing `STRIPE_SECRET_KEY`, or Supabase migration `20250831110000_stripe_connect.sql` not applied. |
| Connect Stripe — "signed up for Connect" | In Stripe Dashboard go to **Connect** → **Get started** and complete platform setup before creating Express accounts. |
| No payment link in email | Stripe keys may be missing. Add `STRIPE_SECRET_KEY` and redeploy. The app will still send the invoice, but without a payment link. |

---

## Local development (optional)

For local testing with real webhooks:

1. Install Stripe CLI: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Run: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Copy the webhook signing secret (`whsec_...`) it outputs.
4. Add `STRIPE_WEBHOOK_SECRET` to `.env.local` with that value.
5. Trigger a test payment; Stripe CLI forwards events to your local app.
