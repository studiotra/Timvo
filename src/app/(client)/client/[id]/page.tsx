import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

export default async function ClientPortalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: access } = await supabase
    .from("client_portal_access")
    .select("client_id")
    .eq("user_id", user.id)
    .eq("client_id", id)
    .single();

  if (!access) notFound();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, billing_type, hourly_rate")
    .eq("client_id", id)
    .order("name");

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: logs } = projectIds.length > 0
    ? await supabase
        .from("time_logs")
        .select(`
          id, project_id, started_at, duration_minutes, description,
          is_billable, is_billed, projects(id, name)
        `)
        .in("project_id", projectIds)
        .order("started_at", { ascending: false })
        .limit(200)
    : { data: [] };

  const logsList = (logs?.data ?? []).map((l) => {
    const p = l.projects as { id: string; name: string } | null;
    return {
      id: l.id,
      project_id: l.project_id,
      project_name: p?.name ?? "—",
      started_at: l.started_at,
      duration_minutes: l.duration_minutes ?? 0,
      description: l.description,
      is_billable: l.is_billable ?? true,
      is_billed: l.is_billed ?? false,
    };
  });

  const totalMins = logsList.reduce((s, l) => s + l.duration_minutes, 0);
  const unbilledMins = logsList
    .filter((l) => l.is_billable && !l.is_billed)
    .reduce((s, l) => s + l.duration_minutes, 0);

  return (
    <div className="space-y-6">
      <Link
        href="/client"
        className="text-sm text-[var(--text-secondary)] hover:text-accent inline-block"
      >
        ← Back to clients
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {client.name}
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
            {Math.floor(totalMins / 60)}h {totalMins % 60}m
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
            Unbilled
          </p>
          <p className="text-xl font-bold text-[var(--text-primary)] mt-1">
            {Math.floor(unbilledMins / 60)}h {unbilledMins % 60}m
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase mb-3">
          Projects
        </h2>
        <div className="space-y-2 mb-6">
          {(projects ?? []).map((p) => (
            <div
              key={p.id}
              className="text-sm text-[var(--text-primary)]"
            >
              {p.name}
              <span className="text-[var(--text-muted)] ml-2">
                · {p.billing_type}
                {p.hourly_rate != null ? ` · $${p.hourly_rate}/hr` : ""}
                {" · "}
                <span
                  className={
                    p.status === "active" ? "text-success" : "text-[var(--text-muted)]"
                  }
                >
                  {p.status}
                </span>
              </span>
            </div>
          ))}
          {(projects ?? []).length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">No projects yet.</p>
          )}
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
                {logsList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-[var(--text-muted)]"
                    >
                      No time logs yet.
                    </td>
                  </tr>
                ) : (
                  logsList.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="px-4 py-3 text-[var(--text-primary)]">
                        {log.started_at
                          ? new Date(log.started_at).toLocaleDateString("en-US")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)]">
                        {log.project_name}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[200px] truncate">
                        {log.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[var(--text-primary)]">
                        {log.duration_minutes} min
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.is_billable ? (
                          <span className="text-success">Yes</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.is_billed ? (
                          <span className="text-indigo-400">Yes</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">No</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {logsList.length > 0 && (
            <div className="border-t border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
              Total: {Math.floor(totalMins / 60)}h {totalMins % 60}m
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
