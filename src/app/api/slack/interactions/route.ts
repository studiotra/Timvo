import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startResponse } from "@/lib/slack/commands";
import { appBaseUrl, verifySlackSignature } from "@/lib/slack/verify";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const valid = verifySlackSignature(
    rawBody,
    req.headers.get("x-slack-request-timestamp"),
    req.headers.get("x-slack-signature")
  );
  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
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
    response_url?: string;
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
    return NextResponse.json({
      response_type: "ephemeral",
      replace_original: true,
      text: `Connect your Timvo account first: ${appBaseUrl()}/settings`,
    });
  }

  if (!projectId) {
    return NextResponse.json({
      response_type: "ephemeral",
      replace_original: true,
      text: "Could not start that project.",
    });
  }

  const result = await startResponse(supabase, conn.user_id, projectId);
  return NextResponse.json({
    ...result,
    replace_original: true,
  });
}
