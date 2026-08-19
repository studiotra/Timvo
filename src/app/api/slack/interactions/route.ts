import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startResponse } from "@/lib/slack/commands";
import { appBaseUrl, verifySlackSignature } from "@/lib/slack/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slackMessage(text: string) {
  return NextResponse.json({
    response_type: "ephemeral",
    replace_original: true,
    text,
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const valid = verifySlackSignature(
      rawBody,
      req.headers.get("x-slack-request-timestamp"),
      req.headers.get("x-slack-signature")
    );
    if (!valid) {
      return slackMessage(
        "Timvo could not verify this Slack request. Check SLACK_SIGNING_SECRET in Vercel (Production) and Redeploy."
      );
    }

    const params = new URLSearchParams(rawBody);
    const payloadRaw = params.get("payload");
    if (!payloadRaw) {
      return NextResponse.json({ ok: true });
    }

    const payload = JSON.parse(payloadRaw) as {
      user?: { id?: string };
      team?: { id?: string };
      actions?: { value?: string }[];
    };

    const slackUserId = payload.user?.id ?? "";
    const teamId = payload.team?.id ?? "";
    const projectId = payload.actions?.[0]?.value;

    const supabase = createAdminClient();
    const { data: conn } = await supabase
      .from("slack_connections")
      .select("user_id")
      .eq("slack_team_id", teamId)
      .eq("slack_user_id", slackUserId)
      .maybeSingle();

    if (!conn) {
      return slackMessage(`Connect your Timvo account first: ${appBaseUrl()}/settings`);
    }

    if (!projectId) {
      return slackMessage("Could not start that project.");
    }

    const result = await startResponse(supabase, conn.user_id, projectId);
    return NextResponse.json({
      ...result,
      replace_original: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return slackMessage(`Timvo hit an error: ${message}`);
  }
}
