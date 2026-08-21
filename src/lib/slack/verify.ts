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

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeText(text: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(text));
}

function base64UrlDecodeText(encoded: string): string {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((encoded.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64UrlEncodeBytes(new Uint8Array(sigBuf));
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

export async function signOAuthState(userId: string, next?: string): Promise<string> {
  const payload = base64UrlEncodeText(
    JSON.stringify({
      uid: userId,
      exp: Date.now() + 10 * 60 * 1000,
      next: next === "/org/settings" ? "/org/settings" : "/settings",
    })
  );
  const sig = await hmacSha256Base64Url(stateSecret(), payload);
  return `${payload}.${sig}`;
}

export async function readOAuthState(state: string | null): Promise<{
  userId: string;
  next: string;
} | null> {
  if (!state) return null;
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = await hmacSha256Base64Url(stateSecret(), payload);
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(base64UrlDecodeText(payload)) as {
      uid?: string;
      exp?: number;
      next?: string;
    };
    if (!data.uid || !data.exp || Date.now() > data.exp) return null;
    return {
      userId: data.uid,
      next: data.next === "/org/settings" ? "/org/settings" : "/settings",
    };
  } catch {
    return null;
  }
}

export function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
