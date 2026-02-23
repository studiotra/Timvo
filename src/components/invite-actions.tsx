"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resendClientInvite, revokeClientInvite } from "@/app/actions/client-invites";

export function InviteActions({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    setLoading(true);
    const r = await resendClientInvite(inviteId);
    if (r.error) alert(r.error);
    else router.refresh();
    setLoading(false);
  }

  async function handleRevoke() {
    if (!confirm("Revoke this invite? They won't be able to use the link.")) return;
    setLoading(true);
    const r = await revokeClientInvite(inviteId);
    if (r.error) alert(r.error);
    else router.refresh();
    setLoading(false);
  }

  return (
    <span className="flex gap-2">
      <button
        type="button"
        onClick={handleResend}
        disabled={loading}
        className="text-xs text-accent hover:underline disabled:opacity-50"
      >
        Resend
      </button>
      <button
        type="button"
        onClick={handleRevoke}
        disabled={loading}
        className="text-xs text-[var(--red)] hover:underline disabled:opacity-50"
      >
        Revoke
      </button>
    </span>
  );
}
