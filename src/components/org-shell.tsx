"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/org", label: "Dashboard", icon: "🏠" },
  { href: "/org/clients", label: "Clients", icon: "📁" },
  { href: "/org/timesheets", label: "Timesheets", icon: "⏱️" },
  { href: "/org/contractors", label: "Contractors", icon: "👥" },
  { href: "/org/settings", label: "Settings", icon: "⚙️" },
] as const;

type OrgShellProps = {
  children: React.ReactNode;
  orgName: string;
  hasContractorDashboard?: boolean;
};

export function OrgShell({ children, orgName, hasContractorDashboard }: OrgShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] transition-transform duration-200 md:static md:z-auto md:w-[220px] md:min-w-[220px] md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4 md:px-5 md:py-6">
          <Link href="/org" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white">
              O
            </div>
            <div>
              <div className="text-[15px] font-bold text-[var(--text-primary)]">Timvo</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Organization
              </div>
            </div>
          </Link>
          <button
            type="button"
            className="md:hidden text-[var(--text-muted)]"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="truncate px-5 py-2 text-[12px] font-medium text-[var(--text-secondary)]">
          {orgName}
        </p>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {navItems.map((item) => {
            const active =
              item.href === "/org"
                ? pathname === "/org"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-[var(--text-secondary)] hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {hasContractorDashboard && (
          <div className="border-t border-[var(--border)] px-3 py-3">
            <Link
              href="/"
              className="block rounded-lg px-3 py-2 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--row-hover)]"
            >
              ← Contractor dashboard
            </Link>
          </div>
        )}

        <div className="border-t border-[var(--border)] p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-[var(--text-secondary)] hover:bg-[var(--row-hover)]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 md:px-6">
          <button
            type="button"
            className="md:hidden text-[var(--text-muted)]"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
