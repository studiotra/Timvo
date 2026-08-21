import { NextRequest } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "tauri://localhost",
  "https://tauri.localhost",
  "http://tauri.localhost",
]);

export function desktopCorsHeaders(req: NextRequest): HeadersInit {
  const origin = req.headers.get("origin");
  const allow =
    origin && (ALLOWED_ORIGINS.has(origin) || origin.startsWith("http://localhost:"))
      ? origin
      : "http://localhost:1420";

  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function withCors(req: NextRequest, res: Response): Response {
  const headers = desktopCorsHeaders(req);
  const next = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) {
    next.headers.set(k, v);
  }
  return next;
}

export function optionsResponse(req: NextRequest) {
  return new Response(null, { status: 204, headers: desktopCorsHeaders(req) });
}
