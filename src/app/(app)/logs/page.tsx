import { Suspense } from "react";
import { getTimeLogs } from "@/app/actions/time-logs";
import { LogsContent } from "./logs-content";

type SearchParams = { view?: string; offset?: string };

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const view = (params.view || "week") as "week" | "month";
  const offset = parseInt(params.offset || "0", 10);

  const logs = await getTimeLogs(view, offset);

  return (
    <Suspense fallback={<div className="text-[var(--text-muted)]">Loading logs…</div>}>
      <LogsContent logs={logs} />
    </Suspense>
  );
}
