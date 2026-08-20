import { getOrgInviteByToken } from "@/app/actions/organizations";
import { OrganizationSignupForm } from "./organization-signup-form";

export default async function OrganizationSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  const token = params.invite?.trim() || null;
  const invite = token ? await getOrgInviteByToken(token) : null;
  const inviteInvalid = Boolean(token && !invite);

  return (
    <OrganizationSignupForm
      inviteToken={invite ? token : null}
      inviteEmail={invite?.email ?? null}
      contractorName={invite?.contractorName ?? null}
      inviteInvalid={inviteInvalid}
    />
  );
}
