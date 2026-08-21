"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/auth/routing";

function DesktopHandoffInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Opening Timvo…");

  useEffect(() => {
    document.cookie = "timvo_desktop=1; path=/; max-age=31536000; SameSite=Lax";

    async function run() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const access_token =
        searchParams.get("access_token") || hash.get("access_token");
      const refresh_token =
        searchParams.get("refresh_token") || hash.get("refresh_token");
      const next = safeNextPath(searchParams.get("next")) ?? "/";

      if (!access_token || !refresh_token) {
        setStatus("No session — redirecting to sign in…");
        router.replace(`/login?desktop=1&next=${encodeURIComponent(next)}`);
        return;
      }

      setStatus("Signing you in…");
      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      // Drop tokens from the address bar immediately.
      window.history.replaceState(null, "", "/auth/desktop?desktop=1");
      setStatus("Loading workspace…");
      router.replace(next.includes("?") ? `${next}&desktop=1` : `${next}?desktop=1`);
      router.refresh();
    }

    void run();
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="text-xl font-semibold">Couldn’t open Timvo Desktop</h1>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <a href="/login?desktop=1" className="mt-6 text-sm font-medium underline">
          Sign in on the web
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-sm text-stone-500">{status}</p>
      <p className="mt-2 text-xs text-stone-400">
        If this stays blank, make sure the Timvo web app is running (localhost:3000 or production).
      </p>
    </main>
  );
}

export default function DesktopHandoffPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
          <p className="text-sm text-stone-500">Opening Timvo…</p>
        </main>
      }
    >
      <DesktopHandoffInner />
    </Suspense>
  );
}
