import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgProjectDetail } from "@/app/actions/org-projects";

export default async function OrgProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id, projectId } = await params;
  const project = await getOrgProjectDetail(id, projectId);
  if (!project) notFound();

  const retainerHours = project.retainerHours;
  const usedPct =
    retainerHours != null && retainerHours > 0
      ? Math.round((project.usedHours / retainerHours) * 100)
      : null;
  const alertAt = project.alertThresholdPct ?? 80;

  return (
    <div>
      <Link
        href={`/org/clients/${project.clientId}`}
        className="text-sm text-[var(--text-secondary)] hover:text-accent"
      >
        ← {project.clientName}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">{project.name}</h1>
      <p className="mb-6 mt-1 text-sm text-[var(--text-secondary)]">
        <span className="capitalize">{project.billingType}</span>
        {project.billRate != null ? ` · $${project.billRate}/hr bill` : ""}
        {project.agreedFee != null ? ` · $${project.agreedFee} fee` : ""}
        {project.retainerHours != null ? ` · ${project.retainerHours}h retainer` : ""}
        {" · "}
        <span className="capitalize">{project.status}</span>
      </p>

      {usedPct != null && retainerHours != null && (
        <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]">
            <span>
              {project.usedHours.toFixed(1)}h used of {retainerHours}h
            </span>
            <span className={usedPct >= alertAt ? "text-amber-400" : ""}>
              {usedPct}% of retainer
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-app)]">
            <div
              className={`h-full rounded-full ${
                usedPct >= 100
                  ? "bg-red-500"
                  : usedPct >= alertAt
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(usedPct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {project.contractors.length === 0 ? (
        <p className="text-[var(--text-muted)]">No contractors or tracked tasks yet.</p>
      ) : (
        <div className="space-y-4">
          {project.contractors.map((contractor) => (
            <section
              key={contractor.userId}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]"
            >
              <div className="border-b border-[var(--border)] bg-[var(--bg-sidebar)]/50 px-4 py-3">
                <p className="font-semibold text-[var(--text-primary)]">
                  {contractor.fullName || contractor.email}
                </p>
                {contractor.businessName && (
                  <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                    {contractor.businessName}
                  </p>
                )}
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{contractor.email}</p>
              </div>
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Tasks</h2>
              </div>
              <div className="p-4">
                {contractor.tasks.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No tasks recorded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {contractor.tasks.map((task, index) => (
                      <li key={`${contractor.userId}-${task.name}-${index}`} className="py-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {task.name}
                          {task.serviceName && (
                            <span className="ml-2 inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                              {task.serviceName}
                            </span>
                          )}
                          <span className="ml-2 font-mono text-xs text-[var(--text-secondary)]">
                            Total: {(task.totalMinutes / 60).toFixed(1)}h
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
