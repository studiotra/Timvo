import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncRetainerSchedulesForUser } from "@/lib/invoices/sync-retainer-invoices";

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
  const { data: clients, error } = await supabase
    .from("clients")
    .select("user_id")
    .eq("invoice_schedule_enabled", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((clients ?? []).map((row) => row.user_id).filter(Boolean))];
  let opened = 0;
  for (const userId of userIds) {
    opened += await syncRetainerSchedulesForUser(supabase, userId);
  }

  return NextResponse.json({ ok: true, users: userIds.length, opened });
}
