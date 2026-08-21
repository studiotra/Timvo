"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Step = "timer" | "submit" | "timesheets";

function formatElapsed(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

const STEPS: { id: Step; label: string; who: string }[] = [
  { id: "timer", label: "Timer", who: "Contractor" },
  { id: "submit", label: "Submit", who: "Contractor" },
  { id: "timesheets", label: "Timesheets", who: "Agency" },
];

export function MarketingProductDemo() {
  const [step, setStep] = useState<Step>("timer");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [logMinutes, setLogMinutes] = useState<number | null>(null);
  const [selected, setSelected] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [approved, setApproved] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      return;
    }
    tickRef.current = window.setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running]);

  function flashMsg(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 1800);
  }

  function startTimer() {
    setRunning(true);
    flashMsg("Timer running");
  }

  function stopTimer() {
    if (!running && elapsed === 0) return;
    setRunning(false);
    const mins = Math.max(1, Math.round(elapsed / 60) || (elapsed > 0 ? 1 : 25));
    // Demo: if stopped quickly, still show a believable log
    const demoMins = elapsed < 5 ? 25 : mins;
    setLogMinutes(demoMins);
    setElapsed(0);
    setStep("submit");
    setSelected(true);
    setSubmitted(false);
    flashMsg("Log saved — ready to submit");
  }

  function submitLogs() {
    if (!selected || logMinutes == null) return;
    setSubmitted(true);
    setStep("timesheets");
    setApproved(false);
    flashMsg("Sent to agency");
  }

  function approve() {
    setApproved(true);
    flashMsg("Approved · mapped to end client");
  }

  function reset() {
    setStep("timer");
    setRunning(false);
    setElapsed(0);
    setLogMinutes(null);
    setSelected(true);
    setSubmitted(false);
    setApproved(false);
    flashMsg("Demo reset");
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div
      id="demo"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1424]/90 shadow-2xl shadow-black/50 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Interactive demo
            </p>
            <p className="mt-0.5 text-sm font-medium text-white/85">
              Timer → submit → timesheets
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Restart
          </button>
        </div>

        <ol className="mt-4 flex gap-1.5 sm:gap-2">
          {STEPS.map((s, i) => {
            const active = s.id === step;
            const done = i < stepIndex || (s.id === "timesheets" && approved);
            return (
              <li key={s.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (i === 0) {
                      setStep("timer");
                      return;
                    }
                    if (i === 1 && logMinutes != null) {
                      setStep("submit");
                      return;
                    }
                    if (i === 2 && submitted) {
                      setStep("timesheets");
                    }
                  }}
                  className={`w-full rounded-lg px-2 py-2 text-left transition ${
                    active
                      ? "bg-indigo-500/25 ring-1 ring-indigo-400/40"
                      : done
                        ? "bg-white/5"
                        : "bg-white/[0.02] opacity-60"
                  }`}
                >
                  <span
                    className={`block text-[10px] font-bold uppercase tracking-wider ${
                      active ? "text-indigo-200" : "text-white/35"
                    }`}
                  >
                    {s.who}
                  </span>
                  <span
                    className={`block truncate text-xs font-semibold sm:text-sm ${
                      active ? "text-white" : "text-white/55"
                    }`}
                  >
                    {i + 1}. {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="relative min-h-[280px] px-4 py-5 sm:px-5 sm:py-6">
        {flash && (
          <p
            key={flash}
            className="demo-flash mb-3 rounded-lg border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-center text-xs font-medium text-indigo-100"
          >
            {flash}
          </p>
        )}

        {step === "timer" && (
          <div className="demo-pane space-y-4">
            <div>
              <p className="text-[11px] text-white/40">Project</p>
              <p className="mt-1 text-base font-semibold text-white">Launch</p>
              <p className="text-sm text-white/45">Northwind · Design</p>
            </div>
            <div
              className={`rounded-xl border px-4 py-5 text-center transition ${
                running
                  ? "border-emerald-400/30 bg-emerald-500/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <p
                className={`font-mono text-4xl font-bold tabular-nums tracking-tight ${
                  running ? "text-emerald-200" : "text-white/80"
                }`}
              >
                {formatElapsed(elapsed)}
              </p>
              <p className="mt-1 text-xs text-white/40">
                {running ? "Running — same clock as web & Slack" : "Idle"}
              </p>
            </div>
            <div className="flex gap-2">
              {!running ? (
                <button
                  type="button"
                  onClick={startTimer}
                  className="flex-1 rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
                >
                  Start timer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopTimer}
                  className="flex-1 rounded-xl bg-rose-500/90 py-3 text-sm font-semibold text-white transition hover:bg-rose-400"
                >
                  Stop & save log
                </button>
              )}
            </div>
            <p className="text-center text-[11px] text-white/35">
              Tip: stop after a few seconds — we&apos;ll treat it as a sample log.
            </p>
          </div>
        )}

        {step === "submit" && (
          <div className="demo-pane space-y-4">
            <div>
              <p className="text-[11px] text-white/40">Your logs</p>
              <p className="mt-1 text-sm text-white/70">
                Select entries to send to the linked agency.
              </p>
            </div>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                selected
                  ? "border-indigo-400/40 bg-indigo-500/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => setSelected(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-indigo-500"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-white">Launch</span>
                  <span className="font-mono text-sm text-indigo-200">
                    {logMinutes ?? 25}m
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-white/40">
                  Northwind · Design · Today
                </span>
              </span>
            </label>
            <button
              type="button"
              disabled={!selected}
              onClick={submitLogs}
              className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit to Studio Agency
            </button>
            <p className="text-center text-[11px] text-white/35">
              Freelancer keeps their own workspace — agency only gets what you submit.
            </p>
          </div>
        )}

        {step === "timesheets" && (
          <div className="demo-pane space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300/70">
                  Agency · Timesheets
                </p>
                <p className="mt-1 text-sm text-white/70">Pending contractor submissions</p>
              </div>
              {!approved && (
                <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                  Pending
                </span>
              )}
              {approved && (
                <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                  Approved
                </span>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">Alex Rivera</p>
                  <p className="mt-0.5 text-xs text-white/40">Contractor source · Launch</p>
                </div>
                <p className="font-mono text-sm text-white/90">{logMinutes ?? 25}m</p>
              </div>
              <div
                className={`mt-3 rounded-lg border px-3 py-2 text-xs transition ${
                  approved
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                    : "border-white/10 bg-black/20 text-white/50"
                }`}
              >
                {approved ? (
                  <>
                    Mapped → <span className="font-semibold text-emerald-50">Acme · Website</span>
                  </>
                ) : (
                  <>Awaiting approve · will map to end-client project</>
                )}
              </div>
            </div>

            {!approved ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={approve}
                  className="flex-1 rounded-xl bg-emerald-500/90 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => flashMsg("Rejected in a real org — try Approve here")}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-sm text-white/70">
                  That&apos;s the loop: track → submit → approve against end-client work.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={reset}
                    className="flex-1 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Replay demo
                  </button>
                  <Link
                    href="/login"
                    className="flex-1 rounded-xl bg-indigo-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-400"
                  >
                    Start free
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .demo-pane {
          animation: demo-in 320ms ease-out;
        }
        .demo-flash {
          animation: demo-flash-in 280ms ease-out;
        }
        @keyframes demo-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes demo-flash-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
