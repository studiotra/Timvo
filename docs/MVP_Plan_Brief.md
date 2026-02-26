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