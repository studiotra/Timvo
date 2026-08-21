"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/contexts/locale-context";
import { SidebarTimerWidget } from "./sidebar-timer-widget";
import { ThemeToggle } from "./theme-toggle";
import { isDesktopShell } from "@/lib/desktop/shell";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/", labelKey: "nav.dashboard", icon: "🏠", id: "dashboard" },
  { href: "/clients", labelKey: "nav.clients", icon: "📁", id: "clients" },
  { href: "/logs", labelKey: "nav.logs", icon: "⏱️", id: "logs" },
  { href: "/invoices", labelKey: "nav.invoices", icon: "🧾", id: "invoices" },
  { href: "/services", labelKey: "nav.services", icon: "📋", id: "services" },
  { href: "/reports", labelKey: "nav.reports", icon: "📊", id: "reports" },
  { href: "/settings", labelKey: "nav.settings", icon: "⚙️", id: "settings" },
] as const;

type AppShellProps = {
  children: React.ReactNode;
  logoUrl?: string | null;
  displayName?: string;
};

export function AppShell({ children, logoUrl, displayName = "?" }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const t = useTranslations();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopShell, setDesktopShell] = useState(false);

  useEffect(() => {
    setDesktopShell(isDesktopShell());
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Sidebar */}
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)] transition-transform duration-200 md:static md:z-auto md:w-[220px] md:min-w-[220px] md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4 md:justify-start md:px-5 md:py-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-indigo-400 text-sm font-bold text-white shadow-lg shadow-indigo-500/40">
              T
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
                Timvo
              </div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
                {desktopShell ? "Desktop" : "Freelance OS"}
              </div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-white/5 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!desktopShell && <SidebarTimerWidget />}

        <nav className="flex-1 px-3 pb-4 pt-2">
          <div className="px-2 pb-1.5 pt-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {t("nav.main")}
          </div>
          <div className="flex flex-col gap-0.5">
            {navItems.map(({ href, labelKey, icon }) => {
              const isActive =
                pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all",
                    isActive
                      ? "bg-indigo-500/12 text-[var(--accent-text)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-accent" />
                  )}
                  <span className="w-[18px] text-center text-[15px]">{icon}</span>
                  {t(labelKey)}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[var(--border)] p-4">
        <button
          onClick={handleSignOut}
          className="w-full py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {t("common.signOut")}
        </button>
        </div>
      </aside>

      {/* Main - Reference: .main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="z-10 flex h-14 items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-sidebar)]/80 px-4 backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex-shrink-0 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-white/5 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-base font-bold tracking-tight text-[var(--text-primary)] md:text-lg">
            {pathname === "/" && t("nav.dashboard")}
            {pathname.startsWith("/clients") && t("nav.clients")}
            {pathname.startsWith("/logs") && t("nav.logs")}
            {pathname.startsWith("/invoices") && t("nav.invoices")}
            {pathname.startsWith("/services") && t("nav.services")}
            {pathname.startsWith("/reports") && t("nav.reports")}
            {pathname.startsWith("/settings") && t("nav.settings")}
            </h1>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
            <span className="hidden font-mono text-[11px] font-medium text-[var(--text-muted)] sm:inline">
              {today}
            </span>
            <ThemeToggle />
            <Link href="/settings" className="flex-shrink-0 rounded-full ring-2 ring-transparent hover:ring-indigo-500/40 transition-all">
              {logoUrl ? (
                <div className="relative h-8 w-8 overflow-hidden rounded-full">
                  <Image
                    src={logoUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-pink-500 text-[13px] font-bold text-white">
                  {displayName
                    .split(/\s+/)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-7">
          {children}
        </div>
      </main>
    </div>
  );
}
