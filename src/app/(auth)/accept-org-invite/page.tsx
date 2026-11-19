import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  acceptOrgMemberInvite,
  getOrgMemberInviteByToken,
} from "@/app/actions/organizations";
import { TimvoLogo } from "@/components/timvo-logo";
import { AcceptOrgInviteForm } from "./accept-org-invite-form";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function AcceptOrgInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token?.trim()) {
    return (
      <InviteMessage
        title="Invalid invite link"
        body="This invite link is missing or invalid. Ask your organization to send a new one."
      />
    );
  }

  const invite = await getOrgMemberInviteByToken(token);
  if (!invite) {
    return (
      <InviteMessage
        title="Invite expired or already used"
        body="This invite has expired or has already been accepted. Ask your organization to send a new one."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const result = await acceptOrgMemberInvite(token);
    if (result.error) {
      return <InviteMessage title="Couldn't accept invite" body={result.error} />;
    }
    redirect("/org");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <TimvoLogo variant="logo" height={40} />
          </div>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {invite.organizationName} invited you to sign up and join as {invite.roleLabel}.
          </p>
        </div>
        <AcceptOrgInviteForm
          token={token}
          email={invite.email}
          organizationName={invite.organizationName}
          roleLabel={invite.roleLabel}
        />
      </div>
    </div>
  );
}

function InviteMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{body}</p>
        <Link href="/login" className="mt-6 inline-block font-medium text-accent hover:underline">
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
