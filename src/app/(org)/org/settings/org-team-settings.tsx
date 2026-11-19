"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  inviteOrgMember,
  removeOrgMember,
  updateOrgMemberRole,
  type OrgMemberInviteRow,
  type OrgMemberRow,
} from "@/app/actions/organizations";

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
] as const;

export function OrgTeamSettings({
  members,
  pendingInvites = [],
  currentUserId,
  currentRole,
}: {
  members: OrgMemberRow[];
  pendingInvites?: OrgMemberInviteRow[];
  currentUserId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const canManage = currentRole === "owner" || currentRole === "admin";
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("manager");
  const [busy, setBusy] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setBusy(true);
    const result = await inviteOrgMember(email, role);
    setBusy(false);
    if (result.error) toast.error(result.error);
    else {
      const label = ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
      toast.success(
        result.invited
          ? `Invite sent. They can sign up and join as ${label}.`
          : "Team member added"
      );
      setEmail("");
      router.refresh();
    }
  }

  async function handleRoleChange(memberId: string, nextRole: string) {
    setActingId(memberId);
    const result = await updateOrgMemberRole(memberId, nextRole);
    setActingId(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Role updated");
      router.refresh();
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this team member from the organization?")) return;
    setActingId(memberId);
    const result = await removeOrgMember(memberId);
    setActingId(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Member removed");
      router.refresh();
    }
  }

  return (
    <section>
      <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        Team
      </div>
      <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <p className="text-[13px] text-[var(--text-secondary)]">
          Add a teammate by email. If they already use Timvo, they are added right away. If
          they don&apos;t have an account, they get an email to sign up and join as the role
          you choose. Managers can track time, review timesheets, and manage clients.
        </p>

        {canManage && (
          <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="teammate@email.com"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-sm"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add member"}
            </button>
          </form>
        )}

        {pendingInvites.length > 0 && (
          <ul className="space-y-2">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 py-2"
              >
                <p className="truncate text-sm text-[var(--text-primary)]">{invite.email}</p>
                <p className="shrink-0 text-xs text-[var(--text-muted)]">
                  Invited as {ROLE_OPTIONS.find((r) => r.value === invite.role)?.label ?? invite.role} · waiting to sign up
                </p>
              </li>
            ))}
          </ul>
        )}

        <ul className="space-y-2">
          {members.map((m) => {
            const isYou = m.userId === currentUserId;
            const roleChoices =
              currentRole === "owner"
                ? [...ROLE_OPTIONS, { value: "owner", label: "Owner" }]
                : ROLE_OPTIONS;
            return (
              <li
                key={m.id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--text-primary)]">
                    {m.email}
                    {isYou ? (
                      <span className="ml-2 text-[11px] text-[var(--text-muted)]">(you)</span>
                    ) : null}
                  </p>
                  {!canManage && (
                    <p className="text-xs capitalize text-[var(--text-muted)]">{m.role}</p>
                  )}
                </div>
                {canManage ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      disabled={actingId === m.id || (isYou && m.role === "owner")}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-xs capitalize"
                    >
                      {!roleChoices.some((r) => r.value === m.role) && (
                        <option value={m.role}>{m.role}</option>
                      )}
                      {roleChoices.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    {!isYou && (
                      <button
                        type="button"
                        disabled={actingId === m.id}
                        onClick={() => handleRemove(m.id)}
                        className="text-xs font-semibold text-red-400 hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
