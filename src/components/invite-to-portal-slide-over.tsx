"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { SlideOver } from "./slide-over";
import { inviteClientToPortal } from "@/app/actions/client-invites";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg disabled:opacity-50"
    >
      {pending ? "Sending..." : "Send invite"}
    </button>
  );
}

type InviteToPortalSlideOverProps = {
  clientId: string;
  clientName: string;
  open: boolean;
  onClose: () => void;
};

export function InviteToPortalSlideOver({
  clientId,
  clientName,
  open,
  onClose,
}: InviteToPortalSlideOverProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const email = (formData.get("email") as string)?.trim();
    if (!email) {
      setError("Email is required");
      return;
    }
    setError(null);
    const result = await inviteClientToPortal(clientId, email);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <SlideOver open={open} onClose={onClose} title="Invite to portal">
      <form action={handleSubmit} className="flex flex-col h-full">
        <div className="p-5 space-y-4 flex-1">
          <p className="text-sm text-[var(--text-secondary)]">
            Send an invite to view time records for <strong>{clientName}</strong>.
            They&apos;ll receive an email to set up their account.
          </p>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Email *
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="client@example.com"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-accent focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--border)] p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          >
            Cancel
          </button>
          <SubmitButton />
        </div>
      </form>
    </SlideOver>
  );
}
