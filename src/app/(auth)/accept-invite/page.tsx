import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInviteByToken } from "@/app/actions/client-invites";
import { AcceptInviteForm } from "./accept-invite-form";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token?.trim()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Invalid invite link</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This invite link is missing or invalid. Please request a new one.
          </p>
          <a
            href="/login"
            className="mt-6 inline-block text-accent hover:underline font-medium"
          >
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  const invite = await getInviteByToken(token);
  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Invite expired or invalid</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This invite has expired or has already been used. Please request a new one.
          </p>
          <a
            href="/login"
            className="mt-6 inline-block text-accent hover:underline font-medium"
          >
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect("/client");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Timvo</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Set up your account to view time records for {invite.clientName}
          </p>
        </div>
        <AcceptInviteForm token={token} email={invite.email} clientName={invite.clientName} />
      </div>
    </div>
  );
}
