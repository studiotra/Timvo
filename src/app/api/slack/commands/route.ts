import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleTimvoCommand } from "@/lib/slack/commands";
import { appBaseUrl, verifySlackSignature } from "@/lib/slack/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slackMessage(text: string) {
  return NextResponse.json({ response_type: "ephemeral", text });
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
      const hasSecret = Boolean(process.env.SLACK_SIGNING_SECRET?.trim());
      return slackMessage(
        hasSecret
          ? "Timvo could not verify this Slack request. In Vercel, confirm SLACK_SIGNING_SECRET matches Basic Information → Signing Secret, is set for Production, then Redeploy."
          : "SLACK_SIGNING_SECRET is missing on the server. Add it in Vercel → Environment Variables (Production) and Redeploy."
      );
    }

    const params = new URLSearchParams(rawBody);
    const slackUserId = params.get("user_id") ?? "";
    const teamId = params.get("team_id") ?? "";
    const text = params.get("text") ?? "";

    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      return slackMessage("Timvo Slack is not fully configured (missing service role key).");
    }

    const { data: conn, error } = await supabase
      .from("slack_connections")
      .select("user_id")
      .eq("slack_team_id", teamId)
      .eq("slack_user_id", slackUserId)
      .maybeSingle();

    if (error) {
      return slackMessage(`Could not look up Slack connection: ${error.message}`);
    }

    if (!conn) {
      return slackMessage(`Connect your Timvo account first: ${appBaseUrl()}/settings`);
    }

    const payload = await handleTimvoCommand(supabase, conn.user_id, text);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return slackMessage(`Timvo hit an error: ${message}`);
  }
}
