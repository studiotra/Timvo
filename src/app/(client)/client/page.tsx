import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

function formatHours(minutes: number) {
  if (!minutes) return "0h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default async function ClientPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accessList } = await supabase
    .from("client_portal_access")
    .select("client_id, invited_by, clients(id, name)")
    .eq("user_id", user.id);

  const clients = (accessList ?? [])
    .filter((a) => a.clients)
    .map((a) => {
      const c = a.clients as unknown as { id: string; name: string };
      return { id: c.id, name: c.name };
    });

  const invitorId = accessList?.[0]?.invited_by;
  let businessName = "your";
  if (invitorId) {
    const { data: invitorProfile } = await supabase
      .from("profiles")
      .select("business_name, full_name")
      .eq("id", invitorId)
      .single();
    businessName =
      invitorProfile?.business_name?.trim() ||
      invitorProfile?.full_name?.trim() ||
      "your";
  }

  const clientIds = clients.map((c) => c.id);
  const { data: projects } =
    clientIds.length > 0
      ? await supabase
          .from("projects")
          .select("id, client_id")
          .in("client_id", clientIds)
      : { data: [] as { id: string; client_id: string }[] };

  const projectIds = (projects ?? []).map((p) => p.id);
  const { data: logs } =
    projectIds.length > 0
      ? await supabase
          .from("time_logs")
          .select("duration_minutes")
          .in("project_id", projectIds)
      : { data: [] as { duration_minutes: number | null }[] };

  const totalMinutes = (logs ?? []).reduce(
    (sum, log) => sum + (log.duration_minutes ?? 0),
    0
  );

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-accent/10 to-indigo-700/5 px-8 py-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Welcome to {businessName} Client Portal
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
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            {clients.length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Projects
          </p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            {(projects ?? []).length}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Time logged
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-[var(--text-primary)]">
            {formatHours(totalMinutes)}
          </p>
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
        {clients.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
            <p className="text-[var(--text-muted)]">
              You don&apos;t have access to any client portals yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {clients.map((c) => (
              <Link
                key={c.id}
                href={`/client/${c.id}`}
                className="group block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-accent/50 hover:bg-accent/5"
              >
                <h3 className="font-semibold text-[var(--text-primary)] transition-colors group-hover:text-accent">
                  {c.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  View time records →
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Getting started
        </h2>
        <ul className="space-y-1">
          <li className="flex items-center gap-2 py-1 text-sm text-[var(--text-primary)]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
            Your account is ready
          </li>
          <li className="flex items-center gap-2 py-1 text-sm text-[var(--text-primary)]">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                clients.length > 0 ? "bg-success" : "bg-[var(--text-muted)]"
              }`}
            />
            Click a client above to view their time records
          </li>
          <li className="flex items-center gap-2 py-1 text-sm text-[var(--text-primary)]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
            Contact your account owner for questions
          </li>
        </ul>
      </div>
    </div>
  );
}
