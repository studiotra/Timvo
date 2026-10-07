/** Shared pulse skeleton for main app route transitions. */
export function PageLoadingSkeleton({
  titleWidth = "w-40",
  rows = 4,
}: {
  titleWidth?: string;
  rows?: number;
}) {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className={`h-8 ${titleWidth} max-w-full rounded-lg bg-[var(--border)]`} />
      <div className="flex flex-wrap gap-3">
        <div className="h-9 w-28 rounded-lg bg-[var(--border)]" />
        <div className="h-9 w-36 rounded-lg bg-[var(--border)]" />
        <div className="h-9 w-24 rounded-lg bg-[var(--border)]" />
      </div>
      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-[var(--border)]"
            style={{ opacity: 1 - i * 0.12 }}
          />
        ))}
      </div>
    </div>
  );
}
