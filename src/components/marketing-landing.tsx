"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingProductDemo } from "@/components/marketing-product-demo";
import { MarketingIntegrationsSection } from "@/components/marketing-integrations";

const steps = [
  {
    n: "01",
    title: "Link contractor and agency",
    body: "Invite either direction. Freelancers keep their own workspace; agencies stay in theirs.",
  },
  {
    n: "02",
    title: "Track on your own projects",
    body: "Timer, logs, and services—same tools whether you bill solo or submit to an agency.",
  },
  {
    n: "03",
    title: "Submit, approve, map",
    body: "Contractors send time for review. Agencies approve and map work to end-client projects.",
  },
];

export function MarketingLanding() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="marketing-root relative min-h-screen overflow-x-hidden bg-[#0a0e17] text-[#f4f6fb]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 70% -10%, rgba(99,102,241,0.28), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 30%, rgba(16,185,129,0.08), transparent 50%), linear-gradient(180deg, #0a0e17 0%, #0d1424 45%, #0a0e17 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
        }}
      />

      <MarketingNav active="product" />

      {/* Hero — brand first, one headline, one support, CTA group, dominant visual plane */}
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-12 px-5 pb-16 pt-6 md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:px-10 md:pb-20 md:pt-4">
        <div
          className={`transition duration-700 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
        >
          <p
            className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Timvo
          </p>
          <h1 className="max-w-xl text-2xl font-semibold leading-snug tracking-tight text-white/95 sm:text-3xl md:text-[2rem] md:leading-snug">
            Time tracking that respects how freelancers and agencies actually work.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">
            Track yourself. Submit to agencies. Approve and map to end clients—without forcing
            freelancers into employee software.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
            >
              Sign up as contractor
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
            >
              Try interactive demo
            </a>
          </div>
          <p className="mt-3 text-xs text-white/35">
            Or{" "}
            <Link href="/signup/organization" className="underline decoration-white/25 underline-offset-2 hover:text-white/55">
              sign up as organization
            </Link>
          </p>
        </div>

        <div
          className={`relative transition duration-1000 delay-150 ${mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
        >
          <MarketingProductDemo />
        </div>
      </section>

      {/* Problem */}
      <section className="relative z-10 border-t border-white/5 px-5 py-20 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="text-3xl font-bold tracking-tight text-white md:text-4xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Agencies don&apos;t own freelancers&apos; clocks.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/50">
            Typical team trackers assume one company workspace. Real work is messier: freelancers
            track their own clients, then hand hours to agencies who bill end clients.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 px-5 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-5xl">
          <h2
            className="mb-10 text-center text-3xl font-bold tracking-tight text-white md:text-4xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            How Timvo works
          </h2>
          <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
            {steps.map((s) => (
              <li key={s.n} className="text-left">
                <p className="font-mono text-xs font-semibold tracking-widest text-indigo-300/80">
                  {s.n}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* For freelancers */}
      <section className="relative z-10 px-5 py-16 md:px-10">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/70">
              For freelancers
            </p>
            <h2
              className="mt-3 text-3xl font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Your OS for time and invoices.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/50">
              Timer, logs, services, and invoices in one place. When an agency links you, submit
              selected logs for approval—without giving up your workspace.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Sign up as contractor
            </Link>
          </div>
          <ul className="space-y-3 text-sm text-white/70">
            {["Sidebar timer + manual logs", "Invoices with Stripe pay links", "Slack start / stop", "Optional agency submit"].map(
              (item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  {item}
                </li>
              )
            )}
          </ul>
        </div>
      </section>

      {/* For agencies */}
      <section className="relative z-10 border-y border-white/5 bg-white/[0.02] px-5 py-16 md:px-10">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <ul className="order-2 space-y-3 text-sm text-white/70 md:order-1">
            {[
              "Contractor timesheet approval",
              "Map shares to end-client projects",
              "Staff timer on org clients",
              "QuickBooks invoice & payment sync",
              "Profitability & retainer alerts",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {item}
              </li>
            ))}
          </ul>
          <div className="order-1 md:order-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300/70">
              For agencies
            </p>
            <h2
              className="mt-3 text-3xl font-bold tracking-tight text-white"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Run freelancers without trapping them.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/50">
              Review submissions, assign rates, map work to end clients, and track your own staff
              time—alongside the contractors you partner with.
            </p>
            <Link
              href="/signup/organization"
              className="mt-6 inline-flex rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
            >
              Sign up as organization
            </Link>
          </div>
        </div>
      </section>

      <MarketingIntegrationsSection />

      {/* Contrast */}
      <section className="relative z-10 px-5 py-20 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="text-3xl font-bold tracking-tight text-white md:text-4xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Built for external talent networks.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/50">
            Not only internal employees on a shared clock. Timvo is for freelancers who invoice,
            and agencies who approve contractor time against real end-client work—without
            employee monitoring.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-5 pb-24 pt-4 md:px-10">
        <div className="marketing-cta mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 px-8 py-12 text-center md:px-12">
          <h2
            className="text-3xl font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Start free. Pick your path.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/50">
            No credit card. Contractor for solos and freelancers. Organization for agencies.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Contractor signup
            </Link>
            <Link
              href="/signup/organization"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Organization signup
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 px-5 py-8 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-white/35 sm:flex-row">
          <span style={{ fontFamily: "var(--font-serif)" }} className="text-white/50">
            Timvo
          </span>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-white/70">
              Sign in
            </Link>
            <Link href="/pricing" className="hover:text-white/70">
              Pricing
            </Link>
            <Link href="/signup/organization" className="hover:text-white/70">
              For organizations
            </Link>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .marketing-cta {
          background: radial-gradient(
              ellipse 80% 80% at 50% 0%,
              rgba(99, 102, 241, 0.22),
              transparent 55%
            ),
            rgba(255, 255, 255, 0.03);
        }
      `}</style>
    </div>
  );
}
