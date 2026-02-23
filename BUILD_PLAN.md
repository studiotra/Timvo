# Apex Billing — Master Build Plan

> A Track-to-Bill web app for freelancers. Time tracking, client management, invoicing, and payments in one seamless loop.

**Last updated:** February 18, 2025

---

## 1. Product Vision

**The "Zero-Effort" Invoice.** Eliminate "Friday Fatigue" — turn active work into a financial document with a single click. No more jumping between Toggl, spreadsheets, and Wave.

---

## 2. Design System (Swiss-Engine Hybrid)

| Element | Specification |
|---------|---------------|
| **Aesthetic** | Swiss structural clarity + high-performance dark-mode feel |
| **Theme** | Light and dark mode (user switchable) |
| **Background (app)** | Deep Charcoal `#111827` |
| **Background (invoices)** | Paper White `#FFFFFF` |
| **Primary action** | Electric Indigo `#6366F1` ("Start Timer", "Generate") |
| **Success** | Emerald `#10B981` ("Paid", "Active") |
| **UI font** | Inter |
| **Time/currency** | JetBrains Mono |
| **Invoice totals (PDF)** | Playfair Display |
| **Components** | Sidebar nav, right-side slide-over modals, glassmorphic cards |

### Sidebar Navigation

1. **Active Timer** — Floating at top
2. **Dashboard**
3. **Clients** — Add client here
4. **Invoices** — Create invoice here
5. **Reports**
6. **Settings** — User logo, bank details, tax settings

---

## 3. Database Schema

### Core Entities

| Table | Purpose |
|-------|---------|
| **users** | Profile, settings, auth |
| **clients** | Name, email, tax ID, custom currency |
| **projects** | Links to client; hourly rate; billing type (hourly/fixed); status (Active/Archived) |
| **services** | Reusable line-item templates for autocomplete (name, default rate) |
| **time_logs** | start, end, duration, description, project_id, is_billable, is_billed |
| **invoices** | Links to client/project; status (Draft/Sent/Paid) |
| **invoice_items** | Links to invoice; either `time_log_id` OR manual fields (description, qty, rate, amount) |

### Key Relationships

```
users ──1:N── clients
clients ──1:N── projects
projects ──1:N── time_logs
projects ──N:M── services (optional: project-level service presets)
invoices ──N:1── clients
invoices ──N:1── projects
invoices ──1:N── invoice_items
invoice_items ──0:1── time_logs (null = manual item)
```

---

## 4. Resolved Feature Map

### A. Time Tracking (Input)

| Feature | Description |
|---------|-------------|
| **Global Timer** | Persistent top bar; Project + Service selectors |
| **Weekly Heatmap** | Bar chart of work density by project |
| **Manual Log** | Retroactive entry; Smart Fields autocomplete from Services |
| **Billable/Non-Billable** | Toggle per log; only billable logs appear in invoice creation |

### B. Client & Project Management (Core)

| Feature | Description |
|---------|-------------|
| **Slide-over Client Creator** | Name, email, tax ID, custom currency |
| **Project Containers** | Per-project: hourly rate, billing type (hourly/fixed), status (Active/Archived) |
| **Services Table** | Reusable descriptions + default rates for autocomplete |

### C. Invoicing (Output)

| Feature | Description |
|---------|-------------|
| **Unified Create Invoice** | Single flow: Client → Project → scope (all unbilled / date range / specific) → checklist of logs |
| **Manual Line Items** | Add items without time logs (fixed-price work, expenses) |
| **AI Log Polisher** | Optional: rewrite notes into professional line-item copy |
| **PDF Engine** | Server-side (Puppeteer) for pixel-perfect output |
| **Send & Lock** | Generate PDF, send email, mark logs as `is_billed = true` |
| **Optional Auto-draft** | Future: "Generate draft every Friday" or "When unbilled > X hours" (not at project creation) |

---

## 5. User Flow (Resolved)

```
┌─────────────────────────────────────────────────────────────┐
│ SETUP (one-time)                                             │
│ Add Clients → Add Projects (rate, hourly/fixed) → Services   │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ TRACK (ongoing)                                               │
│ Global Timer: select Project/Service → work → auto-save       │
│ Manual Log: retroactive + Services autocomplete               │
│ Toggle: Billable / Non-Billable per log                       │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ DASHBOARD                                                    │
│ Weekly Heatmap | "$X Unbilled" badge | "Create Invoice" CTA   │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ CREATE INVOICE (unified flow)                                 │
│ 1. Select Client → Project                                    │
│ 2. Scope: All unbilled | Date range | Specific logs            │
│ 3. Slide-over: checklist of logs (uncheck to exclude)         │
│ 4. Optional: AI Polish descriptions                           │
│ 5. Optional: Add manual line items                            │
│ 6. Preview → Send & Lock                                      │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│ SEND & LOCK                                                   │
│ PDF generated → Email sent (app) → Stripe payment link        │
│ Included logs: is_billed = true                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Tech Stack

| Layer | Choice |
|-------|--------|
| **Frontend** | Next.js (React), Tailwind CSS, Shadcn/ui |
| **Backend** | Supabase (Auth, PostgreSQL, Real-time) |
| **PDF** | Puppeteer (server-side rendering) |
| **Payments** | Stripe Connect (invoice payment links) |
| **Email** | App-side (e.g. Resend/SendGrid) for branded PDF + Stripe link |

---

## 7. Phased Build Plan

### Phase 1: Foundation (Weeks 1–2)

**Goal:** Auth, schema, base UI shell.

| Task | Priority | Notes |
|------|----------|-------|
| Init Next.js + Tailwind + Shadcn | P0 | App router, TypeScript |
| Supabase project setup | P0 | Auth, DB connection |
| Database schema migration | P0 | Users, Clients, Projects, Services, TimeLogs, Invoices, InvoiceItems |
| Auth flow (sign up, login) | P0 | Supabase Auth |
| App shell + sidebar nav | P0 | Design system, light/dark toggle |
| Settings page skeleton | P1 | Placeholder for logo, bank, tax |

**Deliverable:** User can sign up, log in, see empty sidebar. Data layer ready.

---

### Phase 2: Clients & Projects (Week 3)

**Goal:** CRUD for clients and projects.

| Task | Priority | Notes |
|------|----------|-------|
| Clients list page | P0 | Table or cards |
| Slide-over client creator | P0 | Name, email, tax ID, currency |
| Projects list (per client) | P0 | Nested or filtered view |
| Project create/edit | P0 | Rate, billing type, status |
| Services CRUD (optional) | P1 | Name, default rate; used for autocomplete |

**Deliverable:** User can add clients and projects. Optional services for later.

---

### Phase 3: Time Tracking (Weeks 4–5)

**Goal:** Timer, manual logs, heatmap.

| Task | Priority | Notes |
|------|----------|-------|
| Global Timer component | P0 | Persistent bar, Project/Service selectors |
| Timer → TimeLog persistence | P0 | Start/stop, auto-save |
| Manual Log form | P0 | Date, duration, project, description; Services autocomplete |
| Billable/Non-Billable toggle | P0 | Per log |
| Weekly Heatmap (Dashboard) | P1 | Bar chart by project |
| "$X Unbilled" badge | P0 | Sum of unbilled × rate |

**Deliverable:** User can track time and see unbilled value. Heatmap optional for MVP.

---

### Phase 4: Invoicing Core (Weeks 6–7)

**Goal:** Create invoice, select logs, send PDF.

| Task | Priority | Notes |
|------|----------|-------|
| "Create Invoice" flow entry | P0 | From Dashboard or Invoices |
| Client → Project selector | P0 | Scope: all unbilled / date range |
| Log checklist slide-over | P0 | Select/deselect logs |
| Manual line items | P1 | Add rows without time logs |
| Invoice preview (web) | P0 | Matches final PDF layout |
| PDF generation (Puppeteer) | P0 | Server-side, pixel-perfect |
| Send & Lock logic | P0 | Mark `is_billed = true` for included logs |
| Invoices list page | P0 | Filter by client/project, status |

**Deliverable:** User can create invoice from logs, preview, generate PDF, mark as billed.

---

### Phase 5: Delivery & Payments (Week 8)

**Goal:** Send invoice, accept payment.

| Task | Priority | Notes |
|------|----------|-------|
| Email sending | P0 | PDF attachment + payment link |
| Stripe Connect setup | P0 | Payment links on invoice |
| Payment webhook | P0 | Update invoice status to Paid |
| Dashboard "Received" state | P1 | Show paid vs unbilled |

**Deliverable:** End-to-end Track → Invoice → Pay flow working.

---

### Phase 6: Polish & Optional (Weeks 9–10)

**Goal:** AI polish, reports, edge cases.

| Task | Priority | Notes |
|------|----------|-------|
| AI Log Polisher | P1 | Optional toggle; LLM integration |
| Reports page | P1 | Revenue by period, by client |
| Fixed-price project support | P1 | Milestones / manual items only |
| Auto-draft (optional) | P2 | e.g. "Weekly draft" setting |

**Deliverable:** Polished MVP with optional features.

---

## 8. Milestone Summary

| Milestone | Target | Output |
|-----------|--------|--------|
| **M1: Foundation** | End of Week 2 | Auth + schema + shell |
| **M2: Data layer** | End of Week 3 | Clients, projects, services |
| **M3: Track** | End of Week 5 | Timer, manual logs, heatmap |
| **M4: Invoice** | End of Week 7 | Create → preview → PDF → lock |
| **M5: Pay** | End of Week 8 | Send, Stripe, payment status |
| **M6: Polish** | End of Week 10 | AI polish, reports, fixed-price |

---

## 9. Out of Scope (for initial build)

- Multi-user / teams
- Recurring invoices
- Expense tracking
- Toggl/Harvest import

---

## 10. Open Decisions

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Email provider | Resend, SendGrid, Supabase Edge | Resend (simple, good DX) |
| AI provider (Log Polisher) | OpenAI, Anthropic | Start with OpenAI |
| Hosting | Vercel, Railway | Vercel (Next.js native) |

---

*Document generated from Brief.txt + review feedback. Use this as the single source of truth for the build.*

cd "/Users/petrahwang/Library/CloudStorage/GoogleDrive-studiotra.petra@gmail.com/My Drive/Invoice Web App"
npm run dev
