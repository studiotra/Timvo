import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getLocalDateString,
  getLocalHour,
  logLocalDateString,
  sendDailyNudgeDm,
} from "@/lib/slack/onboarding";
import { getActiveTimerForUser } from "@/lib/slack/timer-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.SLACK_SIGNING_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  const query = req.nextUrl.searchParams.get("secret");
  return header === `Bearer ${secret}` || query === secret;
}

async function hasLoggedToday(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  timezone: string
): Promise<boolean> {
  const today = getLocalDateString(timezone);
  if (!today) return true;

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("time_logs")
    .select("started_at")
    .eq("user_id", userId)
    .gte("started_at", since);

  return (data ?? []).some((log) => logLocalDateString(log.started_at, timezone) === today);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: connections } = await supabase
    .from("slack_connections")
    .select("user_id, slack_user_id, bot_access_token, last_daily_nudge_date");

  const results: string[] = [];

  for (const conn of connections ?? []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("id", conn.user_id)
      .maybeSingle();

    const timezone = profile?.timezone || "America/New_York";
    const hour = getLocalHour(timezone);
    if (hour !== 9) continue;

    const today = getLocalDateString(timezone);
    if (!today || conn.last_daily_nudge_date === today) continue;

    const active = await getActiveTimerForUser(supabase, conn.user_id);
    if (active) continue;

    const logged = await hasLoggedToday(supabase, conn.user_id, timezone);
    if (logged) continue;

    const dm = await sendDailyNudgeDm(conn.bot_access_token, conn.slack_user_id);
    if (!dm.ok) {
      results.push(`${conn.user_id}:failed:${dm.error ?? "unknown"}`);
      continue;
    }

    await supabase
      .from("slack_connections")
      .update({ last_daily_nudge_date: today, updated_at: new Date().toISOString() })
      .eq("user_id", conn.user_id);

    results.push(`${conn.user_id}:nudged`);
  }

  return NextResponse.json({ ok: true, nudges: results });
}
