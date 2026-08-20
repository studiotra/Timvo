"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  assignContractorToProject,
  removeContractorFromProject,
  type ProjectContractorRow,
} from "@/app/actions/org-projects";

export function ProjectContractorsPanel({
  projectId,
  contractors,
}: {
  projectId: string;
  contractors: ProjectContractorRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [costRate, setCostRate] = useState("");
  const [billRate, setBillRate] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await assignContractorToProject(
      projectId,
      email,
      costRate ? parseFloat(costRate) : undefined,
      billRate ? parseFloat(billRate) : undefined
    );
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Contractor assigned");
      setEmail("");
      setCostRate("");
      setBillRate("");
      router.refresh();
    }
  }

  async function handleRemove(contractorUserId: string) {
    setBusy(true);
    const result = await removeContractorFromProject(projectId, contractorUserId);
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Contractor removed");
      router.refresh();
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--text-muted)]">
        Assigned contractors
      </h4>
      {contractors.length === 0 ? (
        <p className="mb-3 text-xs text-[var(--text-muted)]">No contractors assigned yet.</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {contractors.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--bg-app)] px-3 py-2 text-xs"
            >
              <span className="text-[var(--text-primary)]">{c.email}</span>
              <span className="text-[var(--text-secondary)]">
                {c.costRate != null ? `$${c.costRate}/hr cost` : "— cost"}
                {" · "}
                {c.billRate != null ? `$${c.billRate}/hr bill` : "— bill"}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRemove(c.contractorUserId)}
                className="text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAssign} className="flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contractor@email.com"
          required
          className="min-w-[180px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-xs"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={costRate}
          onChange={(e) => setCostRate(e.target.value)}
          placeholder="Cost $/hr"
          className="w-24 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-xs"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={billRate}
          onChange={(e) => setBillRate(e.target.value)}
          placeholder="Bill $/hr"
          className="w-24 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-2 py-1.5 text-xs"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          Assign
        </button>
      </form>
    </div>
  );
}
