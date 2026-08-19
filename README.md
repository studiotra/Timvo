# Timvo

See what your time is really worth — not just how long you worked. A Track-to-Bill web app for freelancers.

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
6. `supabase/migrations/20250220000000_client_portal.sql` (client invites & portal access)
7. `supabase/migrations/20250221000000_fix_clients_rls.sql` (fix clients RLS for owner insert)
8. `supabase/migrations/20250222000000_clients_rls_simplify.sql` (simplify clients RLS policies)
9. `supabase/migrations/20250224000000_add_business_contact_fields.sql` (phone, address for Bill From)

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

### 6. Resend (for invoices & invite emails)

1. Create an account at [resend.com](https://resend.com) and get an API key
2. Add to `.env.local`:
   - `RESEND_API_KEY` (your API key)
   - `EMAIL_FROM` (defaults to `onboarding@resend.dev` if omitted)

**Invite emails:** Resend's default sender (`onboarding@resend.dev`) can only send to:
- The email address of your Resend account, or
- `delivered@resend.dev` (test address)

To send invites to real client emails, [verify your domain](https://resend.com/domains) in Resend and set `EMAIL_FROM` to e.g. `noreply@yourdomain.com`.

### 7. Slack (optional, timer from Slack)

1. Create an app at [api.slack.com/apps](https://api.slack.com/apps) → **From scratch**
2. **OAuth & Permissions** → Redirect URL: `https://your-domain.com/api/slack/oauth/callback` (or `http://localhost:3000/api/slack/oauth/callback` for local)
3. Bot token scopes: `commands`, `chat:write`
4. **Slash Commands** → Create `/timvo` → Request URL: `https://your-domain.com/api/slack/commands`
5. **Interactivity & Shortcuts** → Enable → Request URL: `https://your-domain.com/api/slack/interactions`
6. Add to `.env.local`:
   - `SLACK_CLIENT_ID`
   - `SLACK_CLIENT_SECRET`
   - `SLACK_SIGNING_SECRET`
7. Run migration `supabase/migrations/20250819000000_slack_connections.sql` in the Supabase SQL editor
8. In Timvo **Settings** → **Connect Slack**

Then: `/timvo start Acme`, `/timvo stop`, `/timvo status`

### 8. Run the app

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


# Timvo
