import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl, signOAuthState } from "@/lib/slack/verify";

export async function GET() {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${appBaseUrl()}/settings?slack=not_configured`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${appBaseUrl()}/login`);
  }

  const redirectUri = `${appBaseUrl()}/api/slack/oauth/callback`;
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "commands,chat:write,im:write");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", signOAuthState(user.id));

  return NextResponse.redirect(url.toString());
}
