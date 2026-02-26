import Link from "next/link";

/** Dummy client detail preview — no auth required. */
export default function ClientDetailPreviewPage() {
  const invitorBusinessName = "Timvo";
  const dummyClient = { name: "Acme Corp" };
  const dummyProjects = [
    { name: "Website Redesign", billing_type: "hourly", hourly_rate: 120, status: "active" },
    { name: "Brand Guidelines", billing_type: "fixed", hourly_rate: null, status: "active" },
  ];
  const dummyLogs = [
    {
      date: "Feb 20, 2025",
      project: "Website Redesign",
      task: "Design review",
      description: "Reviewed mockups and provided feedback",
      duration: "2h 15m",
      billable: true,
      billed: false,
    },
    {
      date: "Feb 18, 2025",
      project: "Website Redesign",
      task: "Development",
      description: "Homepage structure and components",
      duration: "4h 30m",
      billable: true,
      billed: false,
    },
    {
      date: "Feb 15, 2025",
      project: "Brand Guidelines",
      task: "Documentation",
      description: "Finalized brand guidelines document",
      duration: "1h 45m",
      billable: true,
      billed: true,
    },
  ];
  const totalHours = "8h 30m";
  const unbilledHours = "6h 45m";

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
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
          <Link
            href="/client-preview"
            className="text-sm text-[var(--text-secondary)] hover:text-accent inline-block"
          >
            ← Back to clients
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {dummyClient.name}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Time records (read-only)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
                Total hours
              </p>
              <p className="text-xl font-bold text-[var(--text-primary)] mt-1">
                {totalHours}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
                Unbilled
              </p>
              <p className="text-xl font-bold text-[var(--text-primary)] mt-1">
                {unbilledHours}
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase mb-3">
              Projects
            </h2>
            <div className="space-y-2 mb-6">
              {dummyProjects.map((p, i) => (
                <div key={i} className="text-sm text-[var(--text-primary)]">
                  {p.name}
                  <span className="text-[var(--text-muted)] ml-2">
                    · {p.billing_type}
                    {p.hourly_rate != null ? ` · $${p.hourly_rate}/hr` : ""}
                    {" · "}
                    <span className="text-success">{p.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase mb-3">
              Time logs
            </h2>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-sidebar)]/50">
                      <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                        Project
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                        Task
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-[var(--text-secondary)]">
                        Billable
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-[var(--text-secondary)]">
                        Billed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dummyLogs.map((log, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="px-4 py-3 text-[var(--text-primary)]">
                          {log.date}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-primary)]">
                          {log.project}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">
                          {log.task}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[200px] truncate">
                          {log.description}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--text-primary)]">
                          {log.duration}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {log.billable ? (
                            <span className="text-success">Yes</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {log.billed ? (
                            <span className="text-indigo-400">Yes</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
                Total: {totalHours}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
