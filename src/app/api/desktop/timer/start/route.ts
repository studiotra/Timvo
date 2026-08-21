import { NextRequest } from "next/server";
import { getDesktopUser, jsonError } from "@/lib/desktop/auth";
import { startDesktopTimer } from "@/lib/desktop/catalog";
import { optionsResponse, withCors } from "@/lib/desktop/cors";

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export async function POST(req: NextRequest) {
  const auth = await getDesktopUser(req);
  if ("error" in auth) return withCors(req, jsonError(auth.error, auth.status));

  let body: {
    projectId?: string;
    taskId?: string;
    serviceId?: string;
    description?: string;
  };
  try {
    body = await req.json();
  } catch {
    return withCors(req, jsonError("Invalid JSON body", 400));
  }

  if (!body.projectId?.trim()) {
    return withCors(req, jsonError("projectId is required", 400));
  }

  const result = await startDesktopTimer(auth.user.id, body.projectId.trim(), {
    taskId: body.taskId?.trim() || undefined,
    serviceId: body.serviceId?.trim() || undefined,
    description: body.description,
  });

  if (result.error) return withCors(req, jsonError(result.error, 400));
  return withCors(req, Response.json(result));
}
