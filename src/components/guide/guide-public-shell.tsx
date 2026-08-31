import Link from "next/link";

export function GuidePublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg-sidebar)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
              T
            </span>
            <span className="text-[15px] font-bold tracking-tight">Timvo</span>
          </Link>
          <nav className="flex items-center gap-4 text-[13px] font-medium">
            <Link href="/guide" className="text-indigo-400">
              Guide
            </Link>
            <Link href="/pricing" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Pricing
            </Link>
            <Link href="/download" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Desktop app
            </Link>
            <Link href="/login" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-indigo-500 px-3 py-1.5 text-white hover:bg-indigo-400"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main className="px-4 py-8 md:px-6 md:py-10">{children}</main>
    </div>
  );
}
