# Timvo

Track work. Invoice fast. Get paid. A Track-to-Bill web app for freelancers.

## Phase 1 — Complete ✓

- [x] Next.js 15 + TypeScript + Tailwind CSS
- [x] Supabase (Auth, Database)
- [x] Database schema migration
- [x] Auth flow (sign up, login)
- [x] App shell + sidebar nav (light/dark toggle)
- [x] Settings page skeleton

## Phase 2 — Complete ✓

- [x] Clients list page (cards with project count)
- [x] Slide-over client creator (name, email, tax ID, currency)
- [x] Client detail page with projects list
- [x] Slide-over project creator (name, rate, billing type, status)
- [x] Services CRUD in Settings (for Phase 3 autocomplete)

## Phase 3 — Complete ✓

- [x] Global Timer bar with Project selector (persists to DB)
- [x] Timer start/stop → TimeLog persistence
- [x] Manual Log form (date, duration, project, description, Services autocomplete)
- [x] Billable/Non-billable toggle per log
- [x] Weekly Heatmap (real data)
- [x] "$X Unbilled" badge (real calculation)

## Phase 4 — Complete ✓

- [x] Create Invoice flow (Client → Project → select logs)
- [x] Send & Lock (creates invoice, marks logs billed)
- [x] Invoice preview / Print to PDF
- [x] Invoices list page

## Phase 5 & 6 — Complete ✓

- [x] Email sending via Resend (PDF attachment)
- [x] Stripe Checkout (payment link created when sending invoice; webhook marks as paid)
- [x] AI Log Polisher (optional toggle in Create Invoice)
- [x] Reports page (revenue by period, by client)
- [x] Manual line items (fixed-price work, no time logs required)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Open **Project Settings** → **API** → copy your **Project URL** and **anon key**
3. Update `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the database migrations

In Supabase: **SQL Editor** → New query → paste and run the contents of:

1. `supabase/migrations/20250218000000_initial_schema.sql`
2. `supabase/migrations/20250218100000_add_stripe_fields.sql` (Stripe payment URL on invoices)
3. `supabase/migrations/20250218200000_business_settings.sql` (Settings: logo, bank, tax)
4. `supabase/migrations/20250219000000_invoice_extras.sql` (footer, terms, overdue status)
5. `supabase/migrations/20250219010000_invoice_settings.sql` (default footer, terms, due days)

### 4. Configure Auth (optional)

In Supabase: **Authentication** → **Providers** — enable Email and any OAuth providers you need.

### 5. Stripe (for payments)

1. Create an account at [stripe.com](https://stripe.com) and get your API keys
2. Add to `.env.local`:
   - `STRIPE_SECRET_KEY` (sk_test_... for testing)
   - `STRIPE_WEBHOOK_SECRET` (whsec_...)
   - `SUPABASE_SERVICE_ROLE_KEY` (from Supabase → Project Settings → API)
3. Create a webhook in [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks):
   - Endpoint: `https://your-domain.com/api/webhooks/stripe` (use ngrok for local dev)
   - Events: `checkout.session.completed`
   - Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

When you send an invoice, a Stripe Checkout link is created and included in the email. The webhook updates the invoice to "Paid" when the customer completes payment.

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, then log in.

## Project structure

```
src/
├── app/
│   ├── (auth)/login/     # Login & sign up
│   ├── (app)/            # Protected app (Dashboard, Clients, etc.)
│   └── auth/callback/    # OAuth callback
├── components/
│   └── app-shell.tsx     # Sidebar, nav, theme toggle
├── lib/
│   ├── supabase/         # Supabase clients
│   └── utils.ts
supabase/migrations/      # SQL schema
```

## Next phases

- **Phase 2:** Clients & projects CRUD
- **Phase 3:** Time tracking (timer, manual logs, heatmap)
- **Phase 4:** Invoicing (create, preview, PDF)
- **Phase 5:** Payments (Stripe, email)
- **Phase 6:** Polish (AI log polisher, reports)

See [BUILD_PLAN.md](./BUILD_PLAN.md) for the full roadmap.

API Keys
https://resend.com/api-keys : re_6mpfDZM6_EwEBJdg7bJFetHL7TH9sVmN9
OPEN AI: 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