"use client";

import { SlideOver } from "@/components/slide-over";
import type { TimeLogRow } from "@/app/actions/time-logs";
import { formatDateOnly } from "@/lib/dates";
import { formatDayDuration } from "@/lib/logs/calendar";

const DESC_SNIPPET_MAX = 80;

export function DayLogsSlideOver({
  open,
  dateKey,
  logs,
  onClose,
  onSelectLog,
}: {
  open: boolean;
  dateKey: string | null;
  logs: TimeLogRow[];
  onClose: () => void;
  onSelectLog: (log: TimeLogRow) => void;
}) {
  const title = dateKey
    ? formatDateOnly(dateKey, { month: "long", year: "numeric" })
    : "Day logs";
  const totalMins = logs.reduce((s, l) => s + (l.duration_minutes ?? 0), 0);

  return (
    <SlideOver open={open} onClose={onClose} title={title}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-[var(--border)] px-7 py-3 text-sm text-[var(--text-secondary)]">
          {logs.length === 0
            ? "No logs this day"
            : `${logs.length} log${logs.length === 1 ? "" : "s"} · ${formatDayDuration(totalMins)}`}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {logs.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-[var(--text-muted)]">
              No time logs for this day.
            </p>
          ) : (
            <ul className="space-y-1">
              {logs.map((log) => {
                const desc =
                  log.description && log.description.length <= DESC_SNIPPET_MAX
                    ? log.description
                    : null;
                const label = [
                  log.project_name,
                  log.client_name ? `(${log.client_name})` : null,
                  `${log.duration_minutes ?? 0}m`,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={log.id}>
                    <button
                      type="button"
                      onClick={() => onSelectLog(log)}
                      className="flex min-h-[40px] w-full flex-col justify-center rounded-lg px-3 py-2 text-left transition hover:bg-[var(--row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {log.project_name}
                        {log.client_name ? (
                          <span className="font-normal text-[var(--text-secondary)]">
                            {" "}
                            · {log.client_name}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        {formatDayDuration(log.duration_minutes ?? 0)}
                        {desc ? ` · ${desc}` : ""}
                      </span>
                      <span className="sr-only">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </SlideOver>
  );
}
