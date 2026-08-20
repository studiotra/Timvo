import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findRetainerAlertsToSend,
  retainerAlertMessage,
} from "@/lib/org/retainer-alerts";
import { dmUser } from "@/lib/slack/post";
import { appBaseUrl } from "@/lib/slack/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.SLACK_SIGNING_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  const query = req.nextUrl.searchParams.get("secret");
  return header === `Bearer ${secret}` || query === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const candidates = await findRetainerAlertsToSend(supabase);
  const results: string[] = [];

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const resend = resendKey ? new Resend(resendKey) : null;

  const { data: allUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(
    (allUsers?.users ?? []).map((u) => [u.id, u.email?.trim()]).filter(([, e]) => e) as [string, string][]
  );

  for (const alert of candidates) {
    const { data: managers } = await supabase
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", alert.organizationId)
      .in("role", ["owner", "admin", "manager"]);

    const msg = retainerAlertMessage(alert);
    const notified = new Set<string>();

    for (const mgr of managers ?? []) {
      if (notified.has(mgr.user_id)) continue;
      notified.add(mgr.user_id);

      const { data: slack } = await supabase
        .from("slack_connections")
        .select("bot_access_token, slack_user_id")
        .eq("user_id", mgr.user_id)
        .maybeSingle();

      if (slack?.bot_access_token && slack.slack_user_id) {
        const dm = await dmUser(
          slack.bot_access_token,
          slack.slack_user_id,
          msg.text,
          [
            {
              type: "section",
              text: { type: "mrkdwn", text: msg.slack },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "View reports", emoji: true },
                  url: `${appBaseUrl()}/org/reports`,
                  action_id: "timvo_retainer_reports",
                },
              ],
            },
          ]
        );
        if (dm.ok) results.push(`${alert.projectId}:${mgr.user_id}:slack:${alert.kind}`);
      }

      const email = emailById.get(mgr.user_id);
      if (email && resend) {
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: msg.subject,
          html: `<p>${msg.text.replace(/\n/g, "<br>")}</p><p><a href="${appBaseUrl()}/org/reports">View reports in Timvo</a></p>`,
        });
        if (!error) results.push(`${alert.projectId}:${mgr.user_id}:email:${alert.kind}`);
      }
    }

    await supabase.from("retainer_alerts").insert({
      project_id: alert.projectId,
      kind: alert.kind,
    });

    results.push(`${alert.projectId}:recorded:${alert.kind}`);
  }

  return NextResponse.json({ ok: true, alerts: results, checked: candidates.length });
}
