import Link from "next/link";

/** Dummy client portal preview — no auth required. For design/demo purposes. */
export default function ClientPortalPreviewPage() {
  const invitorBusinessName = "Timvo";
  const dummyClients = [
    { id: "1", name: "Acme Corp" },
    { id: "2", name: "Beta Industries" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      {/* Shell header */}
      <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-6">
        <Link href="/client-preview" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-indigo-400 text-sm font-bold text-white">
            {invitorBusinessName.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold text-[var(--text-primary)]">{invitorBusinessName}</span>
          <span className="text-sm text-[var(--text-muted)]">— Client Portal</span>
        </Link>
        <span className="text-xs text-[var(--text-muted)] px-3 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border)]">
          Preview
        </span>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Your clients
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Select a client to view their time records.
            </p>
          </div>

          <div className="grid gap-3">
            {dummyClients.map((c) => (
              <Link
                key={c.id}
                href="/client-preview/example"
                className="block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:bg-white/5 transition-colors"
              >
                <h2 className="font-semibold text-[var(--text-primary)]">{c.name}</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                  View time records
                </p>
              </Link>
            ))}
          </div>

          <p className="text-xs text-[var(--text-muted)] pt-4">
            Preview only — no authentication required. Click &quot;Acme Corp&quot; to see the client detail view.
          </p>
        </div>
      </main>
    </div>
  );
}
