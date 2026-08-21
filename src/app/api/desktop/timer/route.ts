import { NextRequest } from "next/server";
import { getDesktopUser, jsonError } from "@/lib/desktop/auth";
import { getDesktopTimer } from "@/lib/desktop/catalog";
import { optionsResponse, withCors } from "@/lib/desktop/cors";

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export async function GET(req: NextRequest) {
  const auth = await getDesktopUser(req);
  if ("error" in auth) return withCors(req, jsonError(auth.error, auth.status));
  const timer = await getDesktopTimer(auth.user.id);
  return withCors(req, Response.json({ timer }));
}
