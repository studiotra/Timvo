"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { TimvoLogo } from "@/components/timvo-logo";

type Props = { invitorBusinessName?: string; hasBusinessDashboard?: boolean };

export function ClientPortalShell({
  invitorBusinessName = "Client Portal",
  hasBusinessDashboard = false,
}: Props) {
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
        <TimvoLogo variant="mark" height={28} />
        <span className="font-bold text-[var(--text-primary)]">{invitorBusinessName}</span>
        <span className="text-sm text-[var(--text-muted)]">— Client Portal</span>
      </Link>
      <div className="flex items-center gap-4">
        {hasBusinessDashboard && (
          <Link
            href="/"
            className="text-sm text-[var(--text-secondary)] hover:text-accent hover:underline"
          >
            Business dashboard
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
