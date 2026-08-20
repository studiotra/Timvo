import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dmUser, postToChannel, runningBlocks, timerLabel, updateMessage } from "@/lib/slack/post";
import { formatElapsed, getActiveTimerForUser } from "@/lib/slack/timer-ops";

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
  const { data: connections } = await supabase
    .from("slack_connections")
    .select(
      "user_id, slack_user_id, bot_access_token, last_channel_id, live_channel_id, live_message_ts, live_log_id"
    );

  const results: string[] = [];

  for (const conn of connections ?? []) {
    const active = await getActiveTimerForUser(supabase, conn.user_id);
    if (!active) continue;

    const elapsedMs = Date.now() - new Date(active.startedAt).getTime();
    const minutes = elapsedMs / 60000;
    const who = timerLabel(active);
    const elapsed = formatElapsed(active.startedAt);

    if (conn.live_channel_id && conn.live_message_ts) {
      await updateMessage(
        conn.bot_access_token,
        conn.live_channel_id,
        conn.live_message_ts,
        `Timer running: ${who} (${elapsed})`,
        runningBlocks({ who, elapsed })
      );
    }

    const kinds: ("1h" | "2h")[] = [];
    if (minutes >= 60) kinds.push("1h");
    if (minutes >= 120) kinds.push("2h");

    for (const kind of kinds) {
      const { data: existing } = await supabase
        .from("slack_timer_alerts")
        .select("id")
        .eq("time_log_id", active.id)
        .eq("kind", kind)
        .maybeSingle();
      if (existing) continue;

      const hours = kind === "2h" ? "2 hours" : "1 hour";
      const text = `Your Timvo timer on *${who}* has been running for ${hours} (${elapsed}). Tap Stop or run \`/timvo stop\` if you forgot.`;
      const blocks = runningBlocks({ who, elapsed });

      const dm = await dmUser(conn.bot_access_token, conn.slack_user_id, text, blocks);
      if (!dm.ok && conn.last_channel_id) {
        await postToChannel(conn.bot_access_token, conn.last_channel_id, text, blocks);
      }

      await supabase.from("slack_timer_alerts").insert({
        time_log_id: active.id,
        kind,
      });
      results.push(`${conn.user_id}:${kind}`);
    }
  }

  return NextResponse.json({ ok: true, alerts: results });
}
