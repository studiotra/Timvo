import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl, readOAuthState } from "@/lib/slack/verify";

export async function GET(req: NextRequest) {
  const base = appBaseUrl();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const userId = readOAuthState(state);

  if (!code || !userId) {
    return NextResponse.redirect(`${base}/settings?slack=error`);
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${base}/settings?slack=not_configured`);
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: `${base}/api/slack/oauth/callback`,
  });

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = (await tokenRes.json()) as {
    ok?: boolean;
    error?: string;
    access_token?: string;
    team?: { id?: string; name?: string };
    authed_user?: { id?: string };
  };

  if (!token.ok || !token.access_token || !token.team?.id || !token.authed_user?.id) {
    return NextResponse.redirect(`${base}/settings?slack=error`);
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("slack_connections").upsert(
    {
      user_id: userId,
      slack_team_id: token.team.id,
      slack_team_name: token.team.name ?? null,
      slack_user_id: token.authed_user.id,
      bot_access_token: token.access_token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.redirect(`${base}/settings?slack=error`);
  }

  return NextResponse.redirect(`${base}/settings?slack=connected`);
}
