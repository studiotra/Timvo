import Link from "next/link";

/** Dummy client portal preview — no auth required. For design/demo purposes. */
export default function ClientPortalPreviewPage() {
  const invitorBusinessName = "Timvo";
  const dummyClients = [
    { id: "1", name: "Acme Corp" },
    { id: "2", name: "Studio X" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-6">
        <Link href="/client-preview" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-indigo-400 text-sm font-bold text-white">
            {invitorBusinessName.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-[var(--text-primary)]">
            {invitorBusinessName}
          </span>
          <span className="text-sm text-[var(--text-muted)]">— Client Portal</span>
        </Link>
        <span className="rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1 text-xs text-[var(--text-muted)]">
          Preview
        </span>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        <div className="mb-8 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-accent/10 to-indigo-700/5 px-8 py-6">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Welcome to {invitorBusinessName} Client Portal
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Your account is set up. You can view time records and project details
            for the clients you&apos;ve been invited to.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Active clients
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">2</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Projects
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">—</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">View per client</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Time logged
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">—</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">View per client</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Status
            </p>
            <p className="mt-2 text-sm font-semibold text-success">Active</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Your clients
          </h2>
          <p className="mb-4 mt-1 text-sm text-[var(--text-secondary)]">
            Select a client to view their time records and project details.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {dummyClients.map((c) => (
              <Link
                key={c.id}
                href="/client-preview/example"
                className="block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-accent/50 hover:bg-accent/5"
              >
                <h3 className="font-semibold text-[var(--text-primary)]">{c.name}</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  View time records →
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Getting started
          </h2>
          <ul className="space-y-1">
            <li className="flex items-center gap-2 py-1 text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              Your account is ready
            </li>
            <li className="flex items-center gap-2 py-1 text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
              Click a client above to view their time records
            </li>
            <li className="flex items-center gap-2 py-1 text-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
              Contact your account owner for questions
            </li>
          </ul>
        </div>

        <p className="pt-6 text-xs text-[var(--text-muted)]">
          Preview only — no authentication required. Click a client to see the
          detail view.
        </p>
      </main>
    </div>
  );
}
