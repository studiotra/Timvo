"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarTimerWidget } from "./sidebar-timer-widget";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: "🏠", id: "dashboard" },
  { href: "/clients", label: "Clients", icon: "📁", id: "clients" },
  { href: "/logs", label: "Logs", icon: "⏱️", id: "logs" },
  { href: "/invoices", label: "Invoices", icon: "🧾", id: "invoices" },
  { href: "/services", label: "Services", icon: "📋", id: "services" },
  { href: "/reports", label: "Reports", icon: "📊", id: "reports" },
  { href: "/settings", label: "Settings", icon: "⚙️", id: "settings" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

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
      {/* Sidebar - Reference: .sidebar */}
      <aside className="no-print flex w-[220px] min-w-[220px] flex-col border-r border-[var(--border)] bg-[var(--bg-sidebar)]">
        <div className="border-b border-[var(--border)] px-5 py-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-indigo-400 text-sm font-bold text-white shadow-lg shadow-indigo-500/40">
              T
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
                Timvo
              </div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
                Freelance OS
              </div>
            </div>
          </Link>
        </div>

        <SidebarTimerWidget />

        <nav className="flex-1 px-3 pb-4 pt-2">
          <div className="px-2 pb-1.5 pt-3 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-600">
            Main
          </div>
          <div className="flex flex-col gap-0.5">
            {navItems.map(({ href, label, icon }) => {
              const isActive =
                pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all",
                    isActive
                      ? "bg-indigo-500/12 text-indigo-200"
                      : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-gray-200"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-accent" />
                  )}
                  <span className="w-[18px] text-center text-[15px]">{icon}</span>
                  {label}
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
            Sign out
          </button>
        </div>
      </aside>

      {/* Main - Reference: .main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="z-10 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-sidebar)]/80 px-8 backdrop-blur-xl">
          <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
            {pathname === "/" && "Dashboard"}
            {pathname.startsWith("/clients") && "Clients & Projects"}
            {pathname.startsWith("/logs") && "Logs"}
            {pathname.startsWith("/invoices") && "Invoices"}
            {pathname.startsWith("/services") && "Services"}
            {pathname.startsWith("/reports") && "Reports"}
            {pathname.startsWith("/settings") && "Settings"}
          </h1>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] font-medium text-[var(--text-muted)]">
              {today}
            </span>
            <ThemeToggle />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-pink-500 text-[13px] font-bold text-white">
              JD
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          {children}
        </div>
      </main>
    </div>
  );
}
