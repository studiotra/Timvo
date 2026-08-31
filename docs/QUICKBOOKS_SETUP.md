# QuickBooks + Stripe Setup for Timvo

Sync sent invoices to QuickBooks Online and record Stripe Checkout payments automatically.

---

## What gets synced

| Timvo event | QuickBooks action |
|-------------|-------------------|
| **Send invoice** | Creates Customer (if new) + Invoice |
| **Stripe payment** (`checkout.session.completed`) | Creates Payment linked to that invoice |

Requires **both** Stripe and QuickBooks to be connected.

---

## Step 1: Create an Intuit Developer app

1. Go to [developer.intuit.com](https://developer.intuit.com) and sign in.
2. **Create an app** → select **QuickBooks Online and Payments**.
3. Under **Keys & credentials**, copy:
   - **Client ID**
   - **Client Secret** (Development / Sandbox first)

4. Add **Redirect URI** (must match exactly):
   ```
   https://www.timvo.work/api/quickbooks/oauth/callback
   ```
   For local dev:
   ```
   http://localhost:3000/api/quickbooks/oauth/callback
   ```

5. Scopes: `com.intuit.quickbooks.accounting`

---

## Step 2: Environment variables

Add to Vercel (and `.env.local` for dev):

| Variable | Example | Notes |
|----------|---------|-------|
| `QUICKBOOKS_CLIENT_ID` | from Intuit dashboard | Required |
| `QUICKBOOKS_CLIENT_SECRET` | from Intuit dashboard | Required |
| `QUICKBOOKS_ENVIRONMENT` | `sandbox` or `production` | Default: sandbox |
| `STRIPE_SECRET_KEY` | `sk_test_…` | Already used for Checkout |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | Webhook triggers QBO payment sync |
| `SUPABASE_SERVICE_ROLE_KEY` | service role | Webhook + token refresh |
| `NEXT_PUBLIC_APP_URL` | `https://www.timvo.work` | OAuth redirect base |

Redeploy after adding vars.

---

## Step 3: Run the database migration

Apply in Supabase SQL editor:

```sql
-- supabase/migrations/20250831100000_quickbooks_integration.sql
```

Creates `quickbooks_connections` and mapping columns on `clients` / `invoices`.

---

## Step 4: Connect QuickBooks in Timvo

1. Log in → **Settings**
2. Click **Connect QuickBooks**
3. Sign in to Intuit and choose your company (use a **Sandbox company** in dev)
4. You should return with “QuickBooks connected”

---

## Step 5: Test the full flow

1. Ensure Stripe is configured (`docs/STRIPE_SETUP.md`)
2. Create a client with email
3. Create and **send** an invoice
4. Check QuickBooks → **Sales → Invoices** (new invoice should appear)
5. Pay via the Stripe link (test card `4242 4242 4242 4242`)
6. Check QuickBooks → invoice should show **Paid** with a linked payment

---

## How it works (technical)

```
Send invoice  → syncInvoiceToQuickBooks()
Stripe webhook → mark paid + syncStripePaymentToQuickBooks()
```

Payment payload uses `LinkedTxn` to apply the payment to the QBO invoice. Deposits go to **Undeposited Funds** (or first Bank account found).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Connect button does nothing | Add `QUICKBOOKS_CLIENT_ID` / `SECRET` and redeploy |
| OAuth redirect mismatch | Redirect URI in Intuit must match `{NEXT_PUBLIC_APP_URL}/api/quickbooks/oauth/callback` |
| Invoice not in QBO | Connect QuickBooks before sending; check server logs |
| Payment not in QBO | Stripe webhook must succeed; user must have QBO connected |
| Sandbox vs Live | Set `QUICKBOOKS_ENVIRONMENT=sandbox` for test companies |

---

## Production (Intuit app review)

To use live QuickBooks companies, submit your app for Intuit production keys and complete their security review. Until then, use **Sandbox** companies for testing.
