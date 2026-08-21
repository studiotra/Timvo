import { NextRequest } from "next/server";
import { getDesktopUser, jsonError } from "@/lib/desktop/auth";
import { listDesktopTasks } from "@/lib/desktop/catalog";
import { optionsResponse, withCors } from "@/lib/desktop/cors";

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export async function GET(req: NextRequest) {
  const auth = await getDesktopUser(req);
  if ("error" in auth) return withCors(req, jsonError(auth.error, auth.status));

  const projectId = req.nextUrl.searchParams.get("projectId")?.trim();
  const serviceId = req.nextUrl.searchParams.get("serviceId")?.trim();
  if (!projectId || !serviceId) {
    return withCors(req, jsonError("projectId and serviceId are required", 400));
  }

  const tasks = await listDesktopTasks(projectId, serviceId);
  return withCors(req, Response.json({ tasks }));
}
