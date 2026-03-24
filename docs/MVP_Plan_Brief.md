The MVP plan is go add valuable features, not for changing exisitng structure. Which means: Do not remove features already built just because its not in the MVP plan. Leave features in MVP plan that we already have built as it is, no need to rebuild unless nessessary. Tell me if any features will conflic or logially not possible.

MVP Goals
- The MVP must deliver 3 core outcomes:
- Show effective hourly rate per client/project
- Rank client profitability
- Provide income visibility (monthly + yearly projection)


Core Features (MVP Scope)
1. Authentication
- Email/password auth
- Password reset
- Basic profile (name, currency, timezone)

2. Client Management
User can:
- Edit / archive client
- View client summary page

3. Project / Engagement Management

Under each client:
User can create projects with:
Project name
Project description field where users can write, and paste formatted text.
Retainer amount (monthly?) (optional)
Agreed fee (for fixed) (optional)
Estimated hours (optional)


4. Manual Time Logging


User can:
Weekly time summary view

5. Invoice Recording (Simple)

Core Intelligence Layer (Critical)
This is where differentiation happens.

6. Effective Hourly Rate Engine
For each:
Project
Client
Overall business
Calculate:
Effective Hourly Rate =
Total Revenue ÷ Total Hours (including unpaid hours)

Display:
Revenue
Total hours
Effective rate
Target rate comparison (if user sets one)

7. Client Profitability Dashboard
Dashboard view must show:
For each client:
Total revenue
Total hours
Effective hourly rate
% of total revenue

Retainer over/under utilization (if applicable)
Sort by:
Most profitable
Least profitable
Most time-consuming
Visual indicator:
Green = high effective rate
Yellow = moderate
Red = low

8. Retainer Utilization Tracking
For retainer clients:
Track:
Agreed monthly hours (if set)
Actual logged hours (monthly)
% utilization

Display:
Under-serviced (<80%)
On target (80–100%)
Over-serviced (>100%)

9. Income Dashboard
Main dashboard must show:
Current month revenue
Last month revenue
Year-to-date revenue

Projected annual revenue (based on last 3 months average)
Revenue by client (bar chart ready structure)
10. Annual Projection Engine
Projected Annual Income =
Average last 3 months revenue × 12

Display:
Current projected annual income
Gap to target income (if user sets goal)

Out of Scope (MVP)
Do NOT build yet:
AI pricing advisor
Scenario modeling
Payment processing
Bank sync
Payroll
Multi-user team accounts
Integrations
Keep MVP lean.
Tech Expectations (High-Level)



UX Principles
Simple over powerful
Clarity over features
Financial insight over task management
Dashboard is the product
The first screen after login must immediately show:
Effective rate
Most profitable client
Revenue projection
User must feel insight in under 30 seconds.

Phase 2 (Post-MVP Roadmap)

CSV import (Toggl)
Pricing advisor
Scenario modeling
Client concentration risk score
Business health score
Team accounts
Invoice generation PDFs
Definition of Success (MVP)

Add features that don’t exist yet

(if missing)

🔹 Effective hourly rate calculation
🔹 Client profitability ranking
🔹 Retainer utilization alerts
🔹 Revenue projection dashboard
🔹 Income stability view
🔹 “Underpriced project” alerts
🔹 Goals vs realized income view

The MVP is successful if:
A freelancer logs data for 30 days and says:
“I didn’t realize Client B was costing me money.”
If that reaction happens, differentiation is working.

Feature Fix: Project Detail → Tasks Tab Should Reflect Logged Time Entries

Problem
In the Project Detail page, the Tasks tab currently only shows manually created tasks.
However, it does not display tasks derived from time entries logged under the project.
This creates inconsistency because:
Time entries are being recorded (e.g. “Concept Creation” logged multiple times)
But the Tasks tab does not aggregate or reflect those logged entries
Users can only manually add/delete tasks inside the Tasks tab

Expected Behavior
The Tasks tab should display an aggregated list of all tasks logged under the project, including:
Tasks created via time tracking
Tasks manually added (if applicable)
Example Scenario:
If the following time entries exist under a project:
Task: “Concept Creation”
2 hours
2 hours
Service Tag: Design

Then in the Tasks tab, it should display:
Concept Creation | Design | Total Time: 4 hours

Time entries with the same:
Task name
Service tag (if applicable)
Should be grouped and summed.

Implementation Requirements
Query all time entries linked to the project.
Group entries by:
task_name
service_tag (if exists)
Sum total duration per group.
Display aggregated result in Tasks tab.

Preserve ability to:
Add manual tasks
Delete manual tasks
Ensure no duplication between manual-only tasks and logged tasks.

Additional Clarification
The Tasks tab should represent a true project workload summary, not just manually defined task placeholders.
It should function as a derived view of logged work.

*UX improvement*
High impact
Toast notifications instead of alert()
Replace alert() for success and errors with toast notifications so feedback feels less disruptive and more consistent.
Hours spent progress indicator
On the project detail "Hours spent" section, use color when nearing or exceeding estimated hours (e.g. yellow at ~80%, red when over) to draw attention without reading numbers.
Create invoice: running total
Show a running total that updates live as groups are selected or deselected, so users can see the invoice amount as they choose what to include.
Manual log: remember last project
When opening the manual log from the dashboard (no project pre-selected), prefill client/project from the last used log to reduce repetitive selection.
Destructive actions: consistent confirmations
Use a shared confirmation pattern (modal or slide-over) for delete actions instead of confirm(), and clearly show what will be deleted.
Medium impact
Breadcrumbs
Add breadcrumbs for paths like Clients → Client Name → Project Name to make navigation clearer and easier to step back.
Search/filter for clients
Add search and optional filters (e.g. by status) once the client list grows beyond a few dozen.
Invoice list: status badges
Use clear, color-coded badges (e.g. Draft, Sent, Paid) and possibly an overdue indicator for past-due invoices.
Empty states
On empty lists (e.g. no projects, no logs), show short guidance and a primary CTA instead of only “No X yet.”
Loading skeletons
Use skeleton loaders instead of spinners for lists (clients, projects, logs) for a smoother loading experience.
Nice to have
Keyboard shortcuts
Add shortcuts for common actions (e.g. N for new log, / for search, Esc to close modals).
Quick add from logs
When creating an invoice, allow adding a manual line item without leaving the log-selection view.
Project list: compact/expanded view
Optional compact list vs expanded cards for clients with many projects.