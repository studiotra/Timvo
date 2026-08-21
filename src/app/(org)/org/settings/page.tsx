import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getOrgContext, listOrgMembers } from "@/app/actions/organizations";
import { SlackSettings } from "@/app/(app)/settings/slack-settings";
import { OrgProfileSettings } from "./org-profile-settings";
import { OrgTeamSettings } from "./org-team-settings";
import { OrgPersonalSettings } from "./org-personal-settings";

export default async function OrgSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ slack?: string }>;
}) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: slackConn }, members] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, locale, timezone")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("slack_connections")
      .select("slack_team_name, slack_user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    listOrgMembers(),
  ]);

  const canEditOrg = ["owner", "admin", "manager"].includes(ctx.role);

  return (
    <div className="max-w-2xl space-y-7">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Organization profile, team, and your personal preferences.
        </p>
      </div>

      <OrgProfileSettings
        name={ctx.org.name}
        slug={ctx.org.slug}
        canEdit={canEditOrg}
      />

      <OrgTeamSettings
        members={members}
        currentUserId={ctx.userId}
        currentRole={ctx.role}
      />

      <OrgPersonalSettings
        email={user.email ?? "—"}
        role={ctx.role}
        fullName={profile?.full_name ?? null}
        timezone={profile?.timezone ?? null}
        locale={profile?.locale ?? null}
      />

      <SlackSettings
        connection={slackConn}
        configured={Boolean(process.env.SLACK_CLIENT_ID)}
        flash={params.slack ?? null}
        returnPath="/org/settings"
      />

      <section>
        <div className="mb-3.5 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Alerts
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Retainer email alerts run every 6 hours for org managers when projects cross their
            threshold (default 80%) or exceed 100%. Configure thresholds on each project.
          </p>
        </div>
      </section>
    </div>
  );
}
