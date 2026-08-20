"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addOrgProject, type OrgProjectRow } from "@/app/actions/org-projects";
import { ProjectContractorsPanel } from "./project-contractors-panel";

export function OrgClientDetailContent({
  clientId,
  clientName,
  clientEmail,
  projects,
}: {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  projects: OrgProjectRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleAddProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const formData = new FormData(e.currentTarget);
    const result = await addOrgProject(clientId, formData);
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Project added");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  return (
    <div>
      <Link href="/org/clients" className="text-sm text-[var(--text-secondary)] hover:text-accent">
        ← Clients
      </Link>
      <h1 className="mt-4 mb-2 text-2xl font-bold text-[var(--text-primary)]">{clientName}</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        End client — add projects and retainers, then assign contractor shared tracking on
        Assignments.
        {clientEmail ? ` · ${clientEmail}` : ""}
      </p>

      <form
        onSubmit={handleAddProject}
        className="mb-8 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
      >
        <h2 className="text-sm font-semibold">Add project</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            required
            placeholder="Project name"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          />
          <select
            name="billing_type"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          >
            <option value="hourly">Hourly</option>
            <option value="fixed">Fixed fee</option>
          </select>
          <input
            name="bill_rate"
            type="number"
            step="0.01"
            placeholder="Bill rate ($/hr)"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          />
          <input
            name="agreed_fee"
            type="number"
            step="0.01"
            placeholder="Agreed fee (fixed)"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          />
          <input
            name="retainer_hours"
            type="number"
            step="0.1"
            placeholder="Retainer hours"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          />
          <input
            name="retainer_amount"
            type="number"
            step="0.01"
            placeholder="Retainer amount ($)"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          />
          <input
            name="alert_threshold_pct"
            type="number"
            min={0}
            max={100}
            defaultValue={80}
            placeholder="Alert at % of retainer"
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add project
        </button>
      </form>

      <h2 className="mb-3 text-sm font-semibold uppercase text-[var(--text-muted)]">Projects</h2>
      {projects.length === 0 ? (
        <p className="text-[var(--text-muted)]">No projects yet.</p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const pct =
              p.retainer_hours && p.retainer_hours > 0
                ? Math.round((p.usedHours / p.retainer_hours) * 100)
                : null;
            return (
              <div
                key={p.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{p.name}</h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {p.billing_type}
                      {p.bill_rate != null ? ` · $${p.bill_rate}/hr bill` : ""}
                      {p.retainer_hours != null ? ` · ${p.retainer_hours}h retainer` : ""}
                    </p>
                  </div>
                  <span className="text-xs capitalize text-[var(--text-secondary)]">{p.status}</span>
                </div>
                {pct != null && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>{p.usedHours.toFixed(1)}h used</span>
                      <span className={pct >= (p.alert_threshold_pct ?? 80) ? "text-amber-400" : ""}>
                        {pct}% of retainer
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-app)]">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 100
                            ? "bg-red-500"
                            : pct >= (p.alert_threshold_pct ?? 80)
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <ProjectContractorsPanel projectId={p.id} contractors={p.contractors} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
