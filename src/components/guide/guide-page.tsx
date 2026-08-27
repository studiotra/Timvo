"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { resetOnboarding } from "@/app/actions/onboarding";
import {
  CONTRACTOR_FAQ,
  CONTRACTOR_GUIDE,
  ORG_FAQ,
  ORG_GUIDE,
  type GuideSection,
} from "@/lib/onboarding/guide-content";

type Tab = "contractor" | "agency";

type Props = {
  defaultTab: Tab;
  showTabs?: boolean;
  basePath: string;
};

function SectionCard({ section }: { section: GuideSection }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-24 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
    >
      <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
        {section.title}
      </h2>
      <p className="mt-1 text-[14px] text-[var(--text-secondary)]">{section.summary}</p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
        {section.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {section.tip && (
        <p className="mt-4 rounded-lg bg-indigo-500/10 px-3 py-2 text-[12px] text-indigo-200/90">
          Tip: {section.tip}
        </p>
      )}
      {section.link && (
        <Link
          href={section.link.href}
          className="mt-4 inline-flex text-[13px] font-semibold text-indigo-400 hover:text-indigo-300"
        >
          Go to {section.link.label} →
        </Link>
      )}
    </section>
  );
}

export function GuidePageClient({ defaultTab, showTabs = true, basePath }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [restarting, setRestarting] = useState(false);
  const sections = tab === "agency" ? ORG_GUIDE : CONTRACTOR_GUIDE;
  const faq = tab === "agency" ? ORG_FAQ : CONTRACTOR_FAQ;

  async function handleRestartTour() {
    setRestarting(true);
    const res = await resetOnboarding();
    setRestarting(false);
    if (res.error) return;
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400/80">
          Help center
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Timvo guide
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-[var(--text-secondary)]">
          Step-by-step instructions for freelancers and agencies. Bookmark this page — it covers
          every major feature.
        </p>
        <button
          type="button"
          onClick={() => void handleRestartTour()}
          disabled={restarting}
          className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--row-hover)] px-4 py-2 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-indigo-500/10 disabled:opacity-50"
        >
          {restarting ? "Starting tour…" : "Restart setup tour"}
        </button>
      </div>

      {showTabs && (
        <div className="mb-8 flex gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1">
          {(
            [
              ["contractor", "For contractors", "/guide"],
              ["agency", "For agencies", "/org/guide"],
            ] as const
          ).map(([id, label, href]) => (
            <Link
              key={id}
              href={href}
              onClick={(e) => {
                if (href === basePath) {
                  e.preventDefault();
                  setTab(id);
                }
              }}
              className={cn(
                "flex-1 rounded-lg px-4 py-2.5 text-center text-[13px] font-semibold transition-colors",
                tab === id
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      <nav className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          On this page
        </p>
        <ul className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="rounded-md bg-[var(--row-hover)] px-2.5 py-1 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-6">
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>

      <section className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">FAQ</h2>
        <dl className="mt-4 space-y-4">
          {faq.map(({ q, a }) => (
            <div key={q}>
              <dt className="text-[14px] font-semibold text-[var(--text-primary)]">{q}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-8 text-center text-[12px] text-[var(--text-muted)]">
        Need more help? Email{" "}
        <a href="mailto:support@timvo.work" className="text-indigo-400 hover:underline">
          support@timvo.work
        </a>
      </p>
    </div>
  );
}
