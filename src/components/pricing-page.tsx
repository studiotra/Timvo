"use client";

import Link from "next/link";
import { Fragment, useState } from "react";

function MarketingNav({ active }: { active?: "pricing" | "welcome" }) {
  return (
    <header className="relative z-20 flex items-center justify-between px-5 py-5 md:px-10">
      <Link href="/welcome" className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/30">
          T
        </span>
        <span
          className="text-xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Timvo
        </span>
      </Link>
      <nav className="flex items-center gap-4 md:gap-6">
        <Link
          href="/welcome"
          className={`hidden text-sm font-medium transition sm:inline ${
            active === "welcome" ? "text-white" : "text-white/55 hover:text-white"
          }`}
        >
          Product
        </Link>
        <Link
          href="/guide"
          className="hidden text-sm font-medium text-white/55 transition hover:text-white sm:inline"
        >
          Guide
        </Link>
        <Link
          href="/pricing"
          className={`text-sm font-medium transition ${
            active === "pricing" ? "text-white" : "text-white/55 hover:text-white"
          }`}
        >
          Pricing
        </Link>
        <Link
          href="/download"
          className="hidden text-sm font-medium text-white/55 transition hover:text-white sm:inline"
        >
          Desktop app
        </Link>
        <Link
          href="/login"
          className="hidden text-sm font-medium text-white/60 transition hover:text-white sm:inline"
        >
          Sign in
        </Link>
        <Link
          href="/login"
          className="rounded-lg bg-white/10 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
        >
          Get started
        </Link>
      </nav>
    </header>
  );
}

type Billing = "monthly" | "annual";

const TEAM_INCLUDED_SEATS = 3;
const FREE_OWN_CLIENTS = 1;
const FREE_OWN_PROJECTS = 3;

const solo = {
  monthly: { per: 4.99, note: null as string | null },
  annual: { per: 3.99, note: "Billed $47.88 yearly" },
};

/** Team = base (includes 3 org seats, owner counts) + per extra seat */
const team = {
  monthly: {
    base: 19.99,
    extraSeat: 7,
    note: null as string | null,
  },
  annual: {
    base: 15.99,
    extraSeat: 4,
    note: "Billed $191.88 yearly for base (3 seats)",
  },
};

const comparison: {
  section: string;
  rows: {
    feature: string;
    free: string | boolean;
    solo: string | boolean;
    team: string | boolean;
  }[];
}[] = [
  {
    section: "Time & projects",
    rows: [
      {
        feature: "Own clients",
        free: `${FREE_OWN_CLIENTS}`,
        solo: "Unlimited",
        team: "Unlimited",
      },
      {
        feature: "Own projects",
        free: `${FREE_OWN_PROJECTS}`,
        solo: "Unlimited",
        team: "Unlimited",
      },
      { feature: "Web timer & manual logs", free: true, solo: true, team: true },
      {
        feature: "Assigned org projects (agency work)",
        free: "Unlimited",
        solo: "Unlimited",
        team: "Unlimited",
      },
      {
        feature: "Desktop menubar timer",
        free: false,
        solo: "Beta",
        team: "Beta",
      },
      { feature: "Services & tasks", free: true, solo: true, team: true },
      { feature: "Slack timer commands", free: false, solo: true, team: true },
    ],
  },
  {
    section: "Freelance ↔ agency workflow",
    rows: [
      {
        feature: "Invoice clients & Stripe pay links",
        free: false,
        solo: true,
        team: true,
      },
      { feature: "Link contractor ↔ agency", free: true, solo: true, team: true },
      { feature: "Submit logs to organization", free: true, solo: true, team: true },
      { feature: "Timesheet approve / reject", free: false, solo: false, team: true },
      {
        feature: "Map shares to end-client projects",
        free: false,
        solo: false,
        team: true,
      },
      {
        feature: "Org seats (staff in the agency)",
        free: false,
        solo: false,
        team: `${TEAM_INCLUDED_SEATS} included · then +$/seat`,
      },
    ],
  },
  {
    section: "Reporting & clients",
    rows: [
      { feature: "Basic reports & income views", free: false, solo: true, team: true },
      {
        feature: "Profitability & retainer alerts",
        free: false,
        solo: false,
        team: true,
      },
      {
        feature: "Public invoice / client view links",
        free: false,
        solo: true,
        team: true,
      },
      {
        feature: "End-client portal access",
        free: "Free",
        solo: "Free",
        team: "Free",
      },
    ],
  },
];

const faqs = [
  {
    q: "What’s included in Free?",
    a: `Free is for getting started and for freelancers linked to an agency. You get ${FREE_OWN_CLIENTS} own client, ${FREE_OWN_PROJECTS} own projects, timer, logs, and submit-to-agency. Assigned org projects from agencies are unlimited. Upgrade to Solo for unlimited clients, invoices, Slack, and desktop.`,
  },
  {
    q: "Does my client need to pay to see invoices or shared timelines?",
    a: "No. Client view links and the end-client portal stay free. They open a secure link—no Timvo subscription required.",
  },
  {
    q: "What’s the difference between Free, Solo, and Team?",
    a: "Free is limited tracking (and agency-linked work). Solo is the full freelancer workspace (unlimited clients, invoices, Slack). Team is the organization workspace: approve contractor timesheets, map work to end clients, and manage staff seats.",
  },
  {
    q: "How do Team seats work?",
    a: `Team includes ${TEAM_INCLUDED_SEATS} organization seats (the owner counts as one). Need more staff? Add seats at the extra-seat rate. Linked freelancers (contractors) are not org seats—they stay on Free or Solo and submit time to you.`,
  },
  {
    q: "What if I start Free and later need invoices?",
    a: "Upgrade to Solo anytime. Your logs and agency links stay; you unlock unlimited clients, invoicing, and the rest of the freelancer toolkit.",
  },
  {
    q: "Is there a desktop app?",
    a: "Yes on Solo and Team (beta) — a menubar / tray timer for macOS and Windows. Free uses the web timer (and Slack is Solo+).",
  },
  {
    q: "Is there a limit on clients or projects?",
    a: `Free: ${FREE_OWN_CLIENTS} own client and ${FREE_OWN_PROJECTS} own projects (plus unlimited assigned agency projects). Solo and Team: unlimited own clients and projects. Team also limits org seats (staff), not clients.`,
  },
  {
    q: "Is there a mobile app?",
    a: "Not yet. Use the web app or Slack (`/timvo`) on the go. Desktop covers the always-on Mac/Windows timer on paid plans.",
  },
];

function Check({ on }: { on: boolean | string }) {
  if (typeof on === "string") {
    return <span className="text-sm font-medium text-emerald-300/90">{on}</span>;
  }
  if (on) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
        ✓
      </span>
    );
  }
  return <span className="text-white/25">—</span>;
}

export function PricingPageContent() {
  const [billing, setBilling] = useState<Billing>("annual");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const soloPrice = solo[billing];
  const teamPrice = team[billing];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0e17] text-[#f4f6fb]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -5%, rgba(99,102,241,0.22), transparent 55%), linear-gradient(180deg, #0a0e17 0%, #0d1424 40%, #0a0e17 100%)",
        }}
      />

      <MarketingNav active="pricing" />

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-[800px] px-5 pb-12 pt-8 text-center md:px-10 md:pt-14">
        <h1
          className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Simple time tracking. Seamless invoicing.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/55">
          Start free. Upgrade when you need unlimited clients, invoices, or an agency workspace.
        </p>

        <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              billing === "monthly" ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              billing === "annual" ? "bg-indigo-500 text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            Annually{" "}
            <span className="ml-1 text-[11px] font-medium opacity-90">Save ~20%</span>
          </button>
        </div>
      </section>

      {/* Cards */}
      <section className="relative z-10 mx-auto flex max-w-5xl flex-col gap-6 px-5 md:flex-row md:items-stretch md:gap-5 md:px-10">
        <article className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
            Free
          </p>
          <p className="mt-1 text-sm text-white/45">Try Timvo · agency-linked freelancers</p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight text-white">$0</span>
            <span className="text-sm text-white/45">/ forever</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Track time, work on assigned agency projects, and submit logs—without a full Solo
            workspace.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Get started free
          </Link>
          <ul className="mt-6 space-y-2.5 text-sm text-white/70">
            {[
              `${FREE_OWN_CLIENTS} own client · ${FREE_OWN_PROJECTS} own projects`,
              "Unlimited assigned org projects",
              "Web timer & manual logs",
              "Submit time to linked agencies",
              "No invoices, Slack, or desktop",
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-white/40">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </article>

        <article className="flex flex-1 flex-col rounded-2xl border border-indigo-400/30 bg-indigo-500/[0.08] p-6 md:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-300/80">
            Solo
          </p>
          <p className="mt-1 text-sm text-white/45">Independent professionals</p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight text-white">
              ${soloPrice.per.toFixed(2)}
            </span>
            <span className="text-sm text-white/45">/ month</span>
          </div>
          {soloPrice.note && (
            <p className="mt-1 text-xs text-white/40">{soloPrice.note}</p>
          )}
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Everything a freelancer needs to track time, generate invoices, and get paid faster.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            Start 14-day free trial
          </Link>
          <ul className="mt-6 space-y-2.5 text-sm text-white/70">
            {[
              "Unlimited clients & projects",
              "Automated invoice generation",
              "Client invoice / share links",
              "Slack & desktop timer",
              "Basic reporting",
              "Submit time to linked agencies",
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-indigo-300">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </article>

        <article className="relative flex flex-1 flex-col rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-6 md:p-7">
          <p className="absolute right-4 top-4 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
            Agencies
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300/80">
            Team
          </p>
          <p className="mt-1 text-sm text-white/45">Agencies & studios</p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight text-white">
              ${teamPrice.base.toFixed(2)}
            </span>
            <span className="text-sm text-white/45">/ month</span>
          </div>
          <p className="mt-1 text-xs text-white/40">
            Includes {TEAM_INCLUDED_SEATS} seats (owner counts as one)
            {teamPrice.note ? ` · ${teamPrice.note}` : ""}
          </p>
          <p className="mt-2 text-sm font-medium text-emerald-100/90">
            + ${teamPrice.extraSeat.toFixed(2)} / extra seat / month
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Approvals, end-client mapping, and staff time. Linked freelancers stay on Free or Solo—not
            seats.
          </p>
          <Link
            href="/signup/organization"
            className="mt-6 inline-flex items-center justify-center rounded-xl border border-white/15 bg-[#0a0e17] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/60"
          >
            Start 14-day free trial
          </Link>
          <ul className="mt-6 space-y-2.5 text-sm text-white/70">
            {[
              `Base includes ${TEAM_INCLUDED_SEATS} seats (owner + staff)`,
              "Add seats anytime at the extra-seat rate",
              "Timesheet approve / reject queue",
              "Project mapping & profitability",
              "Staff timer on org clients",
              "Unlimited linked contractors (not seats)",
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-emerald-300">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </article>
      </section>

      {/* Free banner */}
      <section className="relative z-10 mx-auto mt-8 max-w-5xl px-5 md:px-10">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/15 to-emerald-500/10 px-6 py-5 text-center md:px-10">
          <p className="text-base font-semibold text-white">
            Client views stay 100% free.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/50">
            Your clients never pay to open invoice links or published timelines. Timvo bills
            freelancers and agencies—not the end client.
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section className="relative z-10 mx-auto mt-16 max-w-5xl px-5 pb-8 md:px-10">
        <h2
          className="mb-6 text-center text-2xl font-bold tracking-tight text-white md:text-3xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Compare plans
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 bg-[#121826]">
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-4 py-3 font-semibold">Feature</th>
                <th className="px-4 py-3 font-semibold">Free</th>
                <th className="px-4 py-3 font-semibold">
                  Solo (${solo.annual.per}/mo)
                </th>
                <th className="px-4 py-3 font-semibold">
                  Team (${team.annual.base.toFixed(2)}/mo · {TEAM_INCLUDED_SEATS} seats)
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((block) => (
                <Fragment key={block.section}>
                  <tr className="bg-white/[0.03]">
                    <td
                      colSpan={4}
                      className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-indigo-200/70"
                    >
                      {block.section}
                    </td>
                  </tr>
                  {block.rows.map((row) => (
                    <tr key={row.feature} className="border-t border-white/5">
                      <td className="px-4 py-3 text-white/75">{row.feature}</td>
                      <td className="px-4 py-3">
                        <Check on={row.free} />
                      </td>
                      <td className="px-4 py-3">
                        <Check on={row.solo} />
                      </td>
                      <td className="px-4 py-3">
                        <Check on={row.team} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-center text-xs text-white/35">
          Annual prices shown in the table header for paid plans. Toggle above for monthly billing.
        </p>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-2xl px-5 py-12 md:px-10 md:py-16">
        <h2
          className="mb-6 text-center text-2xl font-bold tracking-tight text-white"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          FAQ
        </h2>
        <div className="space-y-2">
          {faqs.map((item, i) => {
            const open = openFaq === i;
            return (
              <div
                key={item.q}
                className="rounded-xl border border-white/10 bg-white/[0.03]"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-sm font-semibold text-white"
                >
                  {item.q}
                  <span className="text-white/40">{open ? "−" : "+"}</span>
                </button>
                {open && (
                  <p className="border-t border-white/5 px-4 py-3 text-sm leading-relaxed text-white/50">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-white/35 sm:flex-row">
          <Link href="/welcome" style={{ fontFamily: "var(--font-serif)" }} className="text-white/50">
            Timvo
          </Link>
          <div className="flex gap-6">
            <Link href="/welcome" className="hover:text-white/70">
              Product
            </Link>
            <Link href="/pricing" className="hover:text-white/70">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-white/70">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
