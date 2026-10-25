"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClientSlideOver } from "@/components/client-slide-over";
import {
  createOrgClient,
  updateOrgClient,
  type OrgClientRow,
} from "@/app/actions/organizations";
import { canManageOrgClients } from "@/lib/org/roles";
import { ArchivedBadge, OrgClientActions } from "./org-client-actions";

export function OrgClientsContent({
  clients,
  role,
}: {
  clients: OrgClientRow[];
  role: string;
}) {
  const router = useRouter();
  const canManage = canManageOrgClients(role);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<OrgClientRow | null>(null);

  const visible = useMemo(
    () => (showArchived ? clients : clients.filter((c) => c.status !== "archived")),
    [clients, showArchived]
  );
  const archivedCount = clients.filter((c) => c.status === "archived").length;

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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Clients</h1>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-3.5 w-3.5 rounded accent-accent"
          />
          Show archived{archivedCount > 0 ? ` (${archivedCount})` : ""}
        </label>
      </div>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        End clients your organization delivers work for (Client 1, Client 2, … in your diagram).
      </p>

      {canManage && (
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
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center text-[var(--text-muted)]">
          {clients.length === 0
            ? "No clients yet. Add your first end client above."
            : "No active clients. Turn on Show archived to see the rest."}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((c) => (
            <div
              key={c.id}
              className="relative rounded-xl border border-[var(--border)] bg-[var(--bg-card)] transition-all hover:border-accent/50 hover:bg-accent/5"
            >
              {canManage && (
                <div className="absolute right-3 top-3">
                  <OrgClientActions
                    client={c}
                    onEdit={() => setEditing(c)}
                    onChanged={() => router.refresh()}
                  />
                </div>
              )}
              <Link href={`/org/clients/${c.id}`} className="block p-5 pr-12">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)]">{c.name}</h3>
                  {c.status === "archived" && <ArchivedBadge />}
                </div>
                {c.email && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{c.email}</p>
                )}
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {c.projectCount} project{c.projectCount === 1 ? "" : "s"} · Manage →
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}

      <ClientSlideOver
        key={editing?.id ?? "org-client-edit"}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSuccess={() => router.refresh()}
        client={editing}
        hideStatus
        onSave={async (formData) => {
          if (!editing) return { error: "Client not found" };
          return updateOrgClient(editing.id, {
            name: String(formData.get("name") ?? ""),
            email: (formData.get("email") as string) || null,
            tax_id: (formData.get("tax_id") as string) || null,
            currency: (formData.get("currency") as string) || "USD",
            address: (formData.get("address") as string) || null,
            phone_number: (formData.get("phone_number") as string) || null,
            business_phone: (formData.get("business_phone") as string) || null,
            extension: (formData.get("extension") as string) || null,
            note: (formData.get("note") as string) || null,
          });
        }}
      />
    </div>
  );
}
