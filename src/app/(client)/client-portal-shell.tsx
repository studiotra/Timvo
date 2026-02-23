"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function ClientPortalShell() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-6">
      <Link href="/client" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-indigo-400 text-sm font-bold text-white">
          T
        </div>
        <span className="font-bold text-[var(--text-primary)]">Timvo</span>
        <span className="text-sm text-[var(--text-muted)]">— Client Portal</span>
      </Link>
      <button
        onClick={handleSignOut}
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        Sign out
      </button>
    </header>
  );
}
