import { createHmac, timingSafeEqual } from "crypto";

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function verifySlackSignature(
  rawBody: string,
  timestamp: string | null,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.SLACK_SIGNING_SECRET?.trim();
  if (!secret || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 60 * 5) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`v0:${timestamp}:${rawBody}`)
  );
  return safeEqual("v0=" + toHex(sigBuf), signature);
}

function stateSecret() {
  return process.env.SLACK_SIGNING_SECRET || process.env.SLACK_CLIENT_SECRET || "";
}

export function signOAuthState(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + 10 * 60 * 1000 })
  ).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readOAuthState(state: string | null): string | null {
  if (!state) return null;
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      uid?: string;
      exp?: number;
    };
    if (!data.uid || !data.exp || Date.now() > data.exp) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
