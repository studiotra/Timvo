"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/app/actions/onboarding";
import {
  stepsForVariant,
  type OnboardingVariant,
} from "@/lib/onboarding/steps";

type Props = {
  variant: OnboardingVariant;
  displayName?: string;
  onDismiss: () => void;
};

export function OnboardingWizard({ variant, displayName, onDismiss }: Props) {
  const router = useRouter();
  const steps = stepsForVariant(variant);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const progress = ((index + 1) / steps.length) * 100;

  async function finish() {
    setBusy(true);
    const res = await completeOnboarding();
    setBusy(false);
    if (res.error) return;
    onDismiss();
    router.refresh();
  }

  async function handleNext() {
    if (isLast) {
      await finish();
      return;
    }
    setIndex((i) => i + 1);
  }

  async function handleSkip() {
    await finish();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-sidebar)] shadow-2xl">
        <div className="h-1 bg-[var(--border)]">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            {variant === "org" ? "Agency setup" : "Getting started"} · {index + 1}/{steps.length}
          </p>
          <button
            type="button"
            onClick={() => void handleSkip()}
            disabled={busy}
            className="text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            Skip tour
          </button>
        </div>

        <div className="px-6 py-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-3xl">
            {step.icon}
          </div>
          <h2
            id="onboarding-title"
            className="text-2xl font-bold tracking-tight text-[var(--text-primary)]"
          >
            {index === 0 && displayName
              ? `${step.title}, ${displayName.split(/\s+/)[0]}`
              : step.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
            {step.body}
          </p>
          {step.bullets && step.bullets.length > 0 && (
            <ul className="mt-5 space-y-2.5">
              {step.bullets.map((b) => (
                <li
                  key={b}
                  className="flex gap-2.5 text-[13px] leading-snug text-[var(--text-secondary)]"
                >
                  <span className="mt-0.5 text-indigo-400">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {step.cta && (
            <Link
              href={step.cta.href}
              className="mt-6 inline-flex text-[13px] font-semibold text-indigo-400 hover:text-indigo-300"
              onClick={() => void handleSkip()}
            >
              {step.cta.label} →
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-4">
          <div className="flex gap-1.5">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Step ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-6 bg-indigo-500" : "w-2 bg-[var(--border)] hover:bg-indigo-500/40"
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                disabled={busy}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--row-hover)] disabled:opacity-50"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleNext()}
              disabled={busy}
              className="rounded-lg bg-indigo-500 px-5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {busy ? "Saving…" : isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
