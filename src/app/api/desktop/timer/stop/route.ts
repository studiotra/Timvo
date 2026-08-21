import { NextRequest } from "next/server";
import { getDesktopUser, jsonError } from "@/lib/desktop/auth";
import { stopDesktopTimer } from "@/lib/desktop/catalog";
import { optionsResponse, withCors } from "@/lib/desktop/cors";

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export async function POST(req: NextRequest) {
  const auth = await getDesktopUser(req);
  if ("error" in auth) return withCors(req, jsonError(auth.error, auth.status));

  const result = await stopDesktopTimer(auth.user.id);
  if (result.error) return withCors(req, jsonError(result.error, 400));
  return withCors(req, Response.json(result));
}
