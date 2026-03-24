# MVP Build Plan

Based on `MVP_Plan_Brief.md`, this plan maps MVP features to the existing codebase, identifies gaps, and outlines implementation phases. **Existing features are preserved; we only add what's missing.**

---

## Current State vs MVP Requirements

### 1. Authentication
| MVP Requirement | Current State | Action |
|-----------------|---------------|--------|
| Email/password auth | ✅ Built | Keep |
| Password reset | ✅ Built | Keep |
| Basic profile (name, currency, timezone) | name ✓, currency ✓ (default_currency in profiles) | **Add timezone** to profiles |

### 2. Client Management
| MVP Requirement | Current State | Action |
|-----------------|---------------|--------|
| Edit client | ✅ Built (ClientSlideOver) | Keep |
| Archive client | ❌ Not built; projects have archive | **Add client archive** (status: active/archived) |
| View client summary page | ✅ `/clients/[id]` exists with projects, invites | Enhance with profitability metrics (see #7) |

### 3. Project / Engagement Management
| MVP Requirement | Current State | Action |
|-----------------|---------------|--------|
| Project name | ✅ | Keep |
| Project description (formatted text) | ❌ | **Add `description` (text/html)** to projects |
| Retainer amount (monthly, optional) | ❌ | **Add `retainer_amount`, `retainer_hours`** (monthly agreed) |
| Agreed fee (for fixed, optional) | ✅ hourly_rate for hourly; partial for fixed | **Add `agreed_fee`** for fixed projects |
| Estimated hours (optional) | ❌ | **Add `estimated_hours`** |
| Billing type (hourly/fixed) | ✅ | Keep; **extend for retainer** |

**Note:** "Retainer" can be modeled as:
- New `billing_type: 'retainer'` **or**
- Existing `billing_type: 'hourly'` + `retainer_amount` + `retainer_hours` (agreed monthly hours)

Recommended: Add retainer fields to projects; treat as hourly billing with utilization tracking.

### 4. Manual Time Logging
| MVP Requirement | Current State | Action |
|-----------------|---------------|--------|
| Manual time entries | ✅ Built (ManualLogSlideOver) | Keep |
| Weekly time summary view | ⚠️ Logs have week/month list + calendar | **Add weekly summary** (aggregate view) to Logs page or Dashboard |

### 5. Invoice Recording (Simple)
| MVP Requirement | Current State | Action |
|-----------------|---------------|--------|
| Create invoices from logs | ✅ | Keep |
| Invoice status (draft/sent/paid/overdue) | ✅ | Keep |
| Record paid amounts | ✅ invoices.total_amount, status=paid | Keep |

---

## Core Intelligence Layer (Critical – MVP Differentiator)

### 6. Effective Hourly Rate Engine
| Scope | Formula | Current State | Action |
|-------|---------|---------------|--------|
| Per project | Total Revenue ÷ Total Hours (incl. unpaid) | ❌ | **Build** |
| Per client | Sum of project revenue ÷ sum of hours | ❌ | **Build** |
| Overall business | Total revenue ÷ total hours | ❌ | **Build** |
| Display | Revenue, hours, effective rate, target rate | ❌ | **Build** |

**Data sources:** `invoices` (status=paid, total_amount), `time_logs` (duration_minutes). Revenue = paid invoices; hours = all logged time (billable + non-billable).

**Target rate:** Add `target_hourly_rate` (optional) to profiles.

### 7. Client Profitability Dashboard
| MVP Requirement | Current State | Action |
|-----------------|---------------|--------|
| Per client: revenue, hours, effective rate, % of total | Partial (Reports: revenue by client) | **Enhance Reports** or new dashboard |
| Retainer over/under utilization | ❌ | **Build** (see #8) |
| Sort: most/least profitable, most time-consuming | ❌ | **Build** |
| Visual: Green / Yellow / Red by effective rate | ❌ | **Build** |

**Location:** New `/reports` section or replace/enhance existing Reports page. MVP says "Dashboard is the product" — consider making this the primary dashboard content.

### 8. Retainer Utilization Tracking
| MVP Requirement | Current State | Action |
|-----------------|---------------|--------|
| Agreed monthly hours | ❌ | **Add `retainer_hours`** to projects |
| Actual logged hours (monthly) | ❌ | **Compute** from time_logs |
| % utilization | ❌ | **Build** |
| Display: under (<80%), on target (80–100%), over (>100%) | ❌ | **Build** |

**Requires:** Projects with `retainer_hours` (and optionally `retainer_amount`).

### 9. Income Dashboard
| MVP Requirement | Current State | Action |
|-----------------|---------------|--------|
| Current month revenue | ⚠️ Dashboard has "received" (paid this month) | Clarify / align |
| Last month revenue | ❌ | **Add** |
| Year-to-date revenue | ✅ Reports has YTD | Reuse / surface on dashboard |
| Projected annual (last 3 months × 12) | ❌ | **Build** |
| Revenue by client (bar chart structure) | ✅ Reports: revenue by client | Expose for chart |

### 10. Annual Projection Engine
| MVP Requirement | Current State | Action |
|-----------------|---------------|--------|
| Projected Annual = Avg(last 3 months) × 12 | ❌ | **Build** |
| Display projected annual | ❌ | **Build** |
| Gap to target (if user sets goal) | ❌ | **Add `annual_income_goal`** to profiles |

---

## UX Principle: "Dashboard is the product"

**MVP spec:** First screen must show in under 30 seconds:
- Effective rate (business-level)
- Most profitable client
- Revenue projection

**Current dashboard:** Unbilled, week total, received this month, heatmap, recent logs, recent invoices.

**Action:** **Redesign main dashboard** to lead with:
1. Effective hourly rate (business)
2. Most profitable client (name + rate)
3. Projected annual income
4. Current month, last month, YTD (compact)
5. Keep recent logs/invoices as secondary sections

---

## Potential Conflicts & Considerations

| Item | Conflict / Note |
|------|-----------------|
| Retainer vs existing billing | No conflict. Add `retainer_hours`, `retainer_amount`; keep `hourly_rate` for blended/effective rate calcs. |
| Revenue definition | MVP implies **paid invoices** = revenue. Current reports use this. Unbilled = pipeline, not revenue. |
| Client archive | Clients table has no status. Add `status` (active/archived). Projects already have it. |
| Invoice Recording | MVP says "Invoice Recording (Simple)". We have full create/send/invoice flow. Keep; MVP likely means "track paid invoices." |
| Target rate | User may set per-project (hourly_rate) or business-level (profiles.target_hourly_rate). MVP mentions "target rate comparison" — add to profiles first. |

---

## Implementation Phases

### Phase 1: Schema & Profile (Foundation)
**Goal:** Add fields needed for all intelligence features.

1. **Migration: profiles**
   - `timezone` (text, e.g. `America/New_York`)
   - `target_hourly_rate` (decimal, optional)
   - `annual_income_goal` (decimal, optional)

2. **Migration: clients**
   - `status` (text: active/archived, default active)

3. **Migration: projects**
   - `description` (text)
   - `retainer_amount` (decimal, optional)
   - `retainer_hours` (decimal, optional — agreed monthly hours)
   - `agreed_fee` (decimal, optional — for fixed projects)
   - `estimated_hours` (decimal, optional)

4. **Settings UI**
   - Timezone selector
   - Target hourly rate (optional)
   - Annual income goal (optional)

---

### Phase 2: Project & Client Enhancements
**Goal:** Support richer project data and client archive.

1. **Project slide-over**
   - Description field (textarea, optional rich paste)
   - Retainer amount, retainer hours
   - Agreed fee (when fixed)
   - Estimated hours

2. **Client slide-over**
   - Archive toggle / status

3. **Client list**
   - Filter by status (active/archived)
   - Visual indicator for archived

---

### Phase 3: Effective Rate Engine
**Goal:** Compute and expose effective hourly rate everywhere.

1. **Server actions**
   - `getEffectiveRates()` — returns project, client, business-level: `{ revenue, totalHours, effectiveRate, targetRate? }`

2. **Data logic**
   - Revenue = sum of `invoices.total_amount` where status = 'paid'
   - Hours = sum of `time_logs.duration_minutes` / 60
   - Scope: project_id, client_id, or all

3. **Display**
   - Client detail page: per-project effective rate
   - Project detail: effective rate for that project

---

### Phase 4: Client Profitability Dashboard
**Goal:** Rank clients and show profitability.

1. **Server action**
   - `getClientProfitability()` — clients with revenue, hours, effective rate, % of total, sort options

2. **UI**
   - New view or enhance Reports: table/cards with sort (profitability, revenue, hours)
   - Color coding: green (high rate), yellow (moderate), red (low) vs target

3. **Retainer utilization** (for projects with retainer_hours)
   - Monthly actual hours vs agreed
   - Utilization % and status (under/on/over)

---

### Phase 5: Income Dashboard & Projection
**Goal:** Revenue visibility and projection.

1. **Server actions**
   - `getIncomeSummary()` — current month, last month, YTD
   - `getProjectedAnnual()` — avg(last 3 months) × 12
   - `getRevenueByClientForChart()` — structure for bar chart

2. **Dashboard redesign**
   - Hero section: Effective rate, most profitable client, projected annual
   - Compact: current month, last month, YTD
   - Optional: bar chart (revenue by client)
   - Keep: unbilled, recent logs, recent invoices

3. **Gap to target**
   - If `annual_income_goal` set: show gap (goal − projected)

---

### Phase 6: Weekly Time Summary & Polish
**Goal:** Complete time logging UX and final polish.

1. **Logs page**
   - "Weekly summary" tab or section: total hours by day, by client/project

2. **i18n**
   - Add new strings for MVP features

3. **Responsive**
   - Ensure new dashboards/charts work on mobile

---

## File / Component Map

| Feature | New Files | Modified Files |
|---------|-----------|----------------|
| Schema | `supabase/migrations/20250301000000_mvp_profiles.sql`, `..._clients.sql`, `..._projects.sql` | — |
| Effective rate | `src/app/actions/effective-rates.ts` | — |
| Client profitability | `src/app/actions/client-profitability.ts` | `src/app/(app)/reports/page.tsx` or new dashboard |
| Income summary | `src/app/actions/income-summary.ts` | `src/app/(app)/page.tsx`, `dashboard-content.tsx` |
| Project fields | — | `project-slide-over.tsx`, `projects.ts`, `project-detail-content.tsx` |
| Client archive | — | `client-slide-over.tsx`, `clients.ts`, `clients-content.tsx` |
| Profile fields | — | `settings-form.tsx`, `settings.ts` |

---

## Out of Scope (per MVP)

- AI pricing advisor
- Scenario modeling
- Payment processing
- Bank sync
- Payroll
- Multi-user / team accounts
- Integrations
- CSV import (Toggl) — Phase 2
- Invoice generation PDFs — Phase 2 (we already have PDF generation; confirm if this means "keep as is")

---

## Success Metric

> *"A freelancer logs data for 30 days and says: 'I didn't realize Client B was costing me money.'"*

The build prioritizes:
1. **Effective rate** (visibility into true earnings per hour)
2. **Client profitability** (who is profitable vs who isn’t)
3. **Projection** (where the business is heading)

---

## Recommended Build Order

1. **Phase 1** (Schema + profile) — unblocks everything
2. **Phase 2** (Project/Client UX) — richer data for calculations
3. **Phase 3** (Effective rate engine) — core metric
4. **Phase 5** (Income dashboard + projection) — main screen impact
5. **Phase 4** (Client profitability) — can be a section of dashboard or Reports
6. **Phase 6** (Weekly summary + polish)

Phases 4 and 5 can be parallelized; Phase 5 has higher impact for "first screen" UX.


*Summary of UX updates: Mar 3 2026*
1. Toast notifications
Replaced all alert() with toast (success and error)
Added Sonner: position="top-center", richColors, closeButton
Success toasts for: invoice created, manual log added, invoice deleted, invite resent/revoked
2. Hours progress colors
Green (accent): &lt; 80% of estimated hours
Amber: 80–100% of estimated hours
Red: over estimated hours
3. Create invoice: live total
Highlighted “Live total” box with accent border
Large total amount in the scrollable area
Footer total kept next to the Create button
4. Breadcrumbs
Client detail: Clients / Client Name
Project detail: Clients / Client Name / Project Name
Breadcrumb links for navigation
5. Invoice status badges
Pill-shaped badges using theme variables
Consistent draft / sent / paid / overdue styling
6. Empty states
Clients list: “No clients yet” or “No projects yet” with short guidance and primary CTA
Client projects: “No projects yet” with brief copy and Add Project button
Project tasks: “No tasks yet. Add a task manually or log time — tasks will appear as you track.”
7. Manual log: remember last client/project
Last-used client and project saved to localStorage on successful submit
When opening from the dashboard (no preselected project), loads last selection
Skips this when opened from a project page (client/project already preselected)
