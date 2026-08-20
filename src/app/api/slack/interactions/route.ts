import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  promptAfterProject,
  promptAfterService,
  refreshLive,
  startResponse,
  stopResponse,
  type SlackCtx,
} from "@/lib/slack/commands";
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
    const valid = await verifySlackSignature(
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
      user?: { id?: string; name?: string; username?: string };
      team?: { id?: string };
      channel?: { id?: string };
      actions?: { action_id?: string; value?: string }[];
    };

    const slackUserId = payload.user?.id ?? "";
    const teamId = payload.team?.id ?? "";
    const action = payload.actions?.[0];
    const value = action?.value ?? "";
    const actionId = action?.action_id ?? "";

    const supabase = createAdminClient();
    const { data: conn } = await supabase
      .from("slack_connections")
      .select("user_id, bot_access_token")
      .eq("slack_team_id", teamId)
      .eq("slack_user_id", slackUserId)
      .maybeSingle();

    if (!conn) {
      return slackMessage(`Connect your Timvo account first: ${appBaseUrl()}/settings`);
    }

    const ctx: SlackCtx = {
      userId: conn.user_id,
      botToken: conn.bot_access_token,
      channelId: payload.channel?.id,
      slackUserId,
      userName: payload.user?.username || payload.user?.name,
    };

    if (actionId.startsWith("timvo_stop") || value === "stop") {
      const result = await stopResponse(supabase, ctx);
      return NextResponse.json(result);
    }

    if (actionId.startsWith("timvo_refresh") || value === "refresh") {
      const result = await refreshLive(supabase, ctx);
      return NextResponse.json(result);
    }

    const parts = value.split("|");
    const kind = parts[0];

    if (kind === "project" && parts[1]) {
      const result = await promptAfterProject(supabase, ctx, parts[1]);
      return NextResponse.json({ ...result, replace_original: true });
    }

    if (kind === "service" && parts[1] && parts[2]) {
      const result = await promptAfterService(supabase, ctx, parts[1], parts[2]);
      return NextResponse.json({ ...result, replace_original: true });
    }

    if (kind === "skip" && parts[1] && parts[2]) {
      const result = await startResponse(supabase, ctx, parts[1], { serviceId: parts[2] });
      return NextResponse.json(result);
    }

    if (kind === "task" && parts[1] && parts[3]) {
      const result = await startResponse(supabase, ctx, parts[1], { taskId: parts[3] });
      return NextResponse.json(result);
    }

    return slackMessage("Could not complete that action. Try `/timvo start` again.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return slackMessage(`Timvo hit an error: ${message}`);
  }
}
