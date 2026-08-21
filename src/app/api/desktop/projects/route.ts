import { NextRequest } from "next/server";
import { getDesktopUser, jsonError } from "@/lib/desktop/auth";
import { listDesktopProjects } from "@/lib/desktop/catalog";
import { optionsResponse, withCors } from "@/lib/desktop/cors";

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export async function GET(req: NextRequest) {
  const auth = await getDesktopUser(req);
  if ("error" in auth) return withCors(req, jsonError(auth.error, auth.status));

  const clientId = req.nextUrl.searchParams.get("clientId")?.trim();
  if (!clientId) return withCors(req, jsonError("clientId is required", 400));

  const projects = await listDesktopProjects(auth.user.id, clientId);
  return withCors(req, Response.json({ projects }));
}
