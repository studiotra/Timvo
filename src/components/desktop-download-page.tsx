"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  lockDesktopDownload,
  unlockDesktopDownload,
} from "@/lib/desktop/download-actions";

type Props = {
  unlocked: boolean;
  macUrl: string | null;
  winUrl: string | null;
  releasesUrl: string;
  versionLabel: string | null;
  configured: boolean;
};

export function DesktopDownloadPage({
  unlocked,
  macUrl,
  winUrl,
  releasesUrl,
  versionLabel,
  configured,
}: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onUnlock(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await unlockDesktopDownload(code);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function onLock() {
    setBusy(true);
    await lockDesktopDownload();
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0e17] text-[#f4f6fb]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(99,102,241,0.2), transparent 55%), linear-gradient(180deg, #0a0e17 0%, #0d1424 45%, #0a0e17 100%)",
        }}
      />

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
        <Link
          href="/welcome"
          className="text-sm font-medium text-white/55 transition hover:text-white"
        >
          Back
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-lg px-5 pb-24 pt-10 md:px-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/70">
          Private beta
        </p>
        <h1
          className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Desktop timer
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/55">
          Menubar / tray app for macOS and Windows. Same clock as the web app and Slack. This
          page is unlisted — share the link and access code only with testers.
        </p>

        {!configured && (
          <div className="mt-8 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-5 py-4 text-sm text-amber-100/90">
            Downloads aren’t configured yet. Set{" "}
            <code className="text-amber-50">DESKTOP_DOWNLOAD_ACCESS_CODE</code> (and optional
            Mac/Windows URLs) in the server environment.
          </div>
        )}

        {configured && !unlocked && (
          <form
            onSubmit={onUnlock}
            className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <label className="block text-sm font-medium text-white/70">
              Access code
              <input
                type="password"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0e17] px-3.5 py-3 text-white outline-none ring-indigo-400/40 focus:ring-2"
                placeholder="Enter invite code"
                required
              />
            </label>
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              {busy ? "Checking…" : "Unlock downloads"}
            </button>
          </form>
        )}

        {configured && unlocked && (
          <div className="mt-8 space-y-4">
            {versionLabel && (
              <p className="text-sm text-white/45">
                Build <span className="font-mono text-white/70">{versionLabel}</span>
              </p>
            )}

            <div className="grid gap-3">
              {macUrl ? (
                <a
                  href={macUrl}
                  className="rounded-xl bg-indigo-500 px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  Download for macOS (.dmg)
                </a>
              ) : (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-center text-sm text-white/45">
                  macOS build not linked yet
                </p>
              )}
              {winUrl ? (
                <a
                  href={winUrl}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Download for Windows (.exe)
                </a>
              ) : (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-center text-sm text-white/45">
                  Windows build not linked yet
                </p>
              )}
            </div>

            {macUrl && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm leading-relaxed text-white/55">
                <p className="font-medium text-white/75">macOS unsigned beta</p>
                <p className="mt-1.5">
                  After installing, if macOS says Timvo is “damaged”, clear the quarantine flag
                  (not actual corruption):
                </p>
                <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 px-3 py-2 font-mono text-[12px] text-indigo-100/90">
                  xattr -cr /Applications/Timvo.app
                </pre>
                <p className="mt-2 text-white/40">
                  Then open Timvo again from Applications.
                </p>
              </div>
            )}

            <a
              href={releasesUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-sm text-white/45 underline decoration-white/20 underline-offset-2 hover:text-white/70"
            >
              All releases on GitHub
            </a>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/50">
              <p className="font-medium text-white/70">Install notes</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>macOS: open the DMG, drag Timvo to Applications. Allow Accessibility for hotkeys.</li>
                <li>Sign in with your Timvo account. Point the app at https://www.timvo.work for production.</li>
                <li>Unsigned builds may need System Settings → Privacy → Open Anyway.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={onLock}
              disabled={busy}
              className="w-full text-sm text-white/40 transition hover:text-white/70"
            >
              Lock this device
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
