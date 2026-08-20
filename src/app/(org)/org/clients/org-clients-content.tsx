"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOrgClient, type OrgClientRow } from "@/app/actions/organizations";

export function OrgClientsContent({ clients }: { clients: OrgClientRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await createOrgClient(name, email);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Client added");
    setName("");
    setEmail("");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Clients</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        End clients your organization delivers work for (Client 1, Client 2, … in your diagram).
      </p>

      <form
        onSubmit={handleAdd}
        className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
      >
        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Add client</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Client name"
            required
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            type="email"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add client"}
          </button>
        </div>
      </form>

      {clients.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center text-[var(--text-muted)]">
          No clients yet. Add your first end client above.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {clients.map((c) => (
              <Link
                key={c.id}
                href={`/org/clients/${c.id}`}
                className="group block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-accent/50 hover:bg-accent/5"
              >
              <h3 className="font-semibold text-[var(--text-primary)]">{c.name}</h3>
              {c.email && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{c.email}</p>
              )}
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {c.projectCount} project{c.projectCount === 1 ? "" : "s"} · Manage →
              </p>
              </Link>
          ))}
        </div>
      )}
    </div>
  );
}
