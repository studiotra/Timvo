# Phase 2: Subscription & Premium Features

This document outlines the premium features planned for the subscription tier.

---

## 1. Profitability Insights

**Problem:** Freelancers don't know which client drains time, which project is underpriced, or their real hourly rate.

**Features:**
- **Real effective hourly rate tracking** – Compare billed vs actual time to see true earnings per hour
- **Client profitability comparison** – Dashboard showing which clients/projects are most profitable
- **Time vs estimate comparison** – Track estimated hours vs actual; flag overruns

**Goal:** Make Timvo a decision-making tool, not just admin.

---

## 2. Smart Auto-Invoice Writer

**Problem:** Manual invoice line descriptions are tedious and inconsistent.

**Features:**
- **Auto-generate invoice descriptions** from time logs
- **Group entries into clean summaries** (e.g. "Website wireframe revisions and responsive layout adjustments – 6.5 hours")
- **Suggest billable vs non-billable** time
- **Polished invoice line descriptions** – Professional, client-ready wording

**Example output:**
> "Website wireframe revisions and responsive layout adjustments – 6.5 hours"

---

## 3. Budget Alerts

**Problem:** Projects often go over budget without warning.

**Features:**
- **Set project hour caps** – Define max hours per project
- **Notifications at 80% and 100%** of budget
- **Auto-suggest invoice** when threshold is hit
- **Visual progress** toward budget limit

---

## 4. Focus Mode Timer

**Problem:** Basic time tracking feels utilitarian.

**Features:**
- **Minimalist focus timer** – Clean, distraction-free interface
- **Optional productivity stats** – Session length, weekly focus hours
- **Deep work session logs** – Track focused blocks separately from admin time

---

## 5. AI Pricing Advisor (Advanced)

**Problem:** Freelancers often undercharge based on gut feel.

**Features:**
- **Analyze logged time** + industry average rates + past project effort
- **Suggest adjustments** – e.g. "You undercharged by 18% on similar projects"
- **Rate recommendations** per project type or client
- **Historical comparison** – Compare current project to past similar work

---

## Implementation Notes

- **Subscription:** Stripe Subscriptions or checkout for premium tier
- **Feature gates:** Check subscription status before rendering premium UI
- **Database:** Add `subscription_tier` or `features` to profiles; consider usage tracking for limits
- **Order of build:** Profitability Insights and Budget Alerts offer quick wins; AI features require more scope
