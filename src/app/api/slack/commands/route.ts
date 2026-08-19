import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleTimvoCommand } from "@/lib/slack/commands";
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
  const slackUserId = params.get("user_id") ?? "";
  const teamId = params.get("team_id") ?? "";
  const text = params.get("text") ?? "";

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Timvo Slack is not fully configured (missing service role key).",
    });
  }

  const { data: conn } = await supabase
    .from("slack_connections")
    .select("user_id")
    .eq("slack_team_id", teamId)
    .eq("slack_user_id", slackUserId)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: `Connect your Timvo account first: ${appBaseUrl()}/settings`,
    });
  }

  const payload = await handleTimvoCommand(supabase, conn.user_id, text);
  return NextResponse.json(payload);
}
