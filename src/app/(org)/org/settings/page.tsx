import { getOrgContext } from "@/app/actions/organizations";

export default async function OrgSettingsPage() {
  const ctx = await getOrgContext();
  if (!ctx) return null;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Organization profile and team configuration.
      </p>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 space-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase text-[var(--text-muted)]">Name</p>
          <p className="text-[var(--text-primary)]">{ctx.org.name}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-[var(--text-muted)]">Your role</p>
          <p className="capitalize text-[var(--text-primary)]">{ctx.role}</p>
        </div>
        <p className="text-sm text-[var(--text-secondary)] pt-2">
          Retainer email and Slack alerts run every 6 hours for org managers when projects
          cross their threshold (default 80%) or exceed 100%.
        </p>
      </div>
    </div>
  );
}
