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

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
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

export function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function stateSecret() {
  return (
    process.env.QUICKBOOKS_CLIENT_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "timvo-qbo-dev"
  );
}

export type QuickBooksEnvironment = "sandbox" | "production";

export function quickbooksEnvironment(): QuickBooksEnvironment {
  return process.env.QUICKBOOKS_ENVIRONMENT === "production" ? "production" : "sandbox";
}

export function quickbooksApiBase(env: QuickBooksEnvironment = quickbooksEnvironment()) {
  return env === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export function quickbooksConfigured() {
  return Boolean(
    process.env.QUICKBOOKS_CLIENT_ID?.trim() && process.env.QUICKBOOKS_CLIENT_SECRET?.trim()
  );
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

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
  token_type?: string;
};

function basicAuthHeader() {
  const id = process.env.QUICKBOOKS_CLIENT_ID?.trim();
  const secret = process.env.QUICKBOOKS_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new Error("QuickBooks not configured");
  return `Basic ${btoa(`${id}:${secret}`)}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const redirectUri = `${appBaseUrl()}/api/quickbooks/oauth/callback`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: basicAuthHeader(),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks token exchange failed: ${text}`);
  }

  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: basicAuthHeader(),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks token refresh failed: ${text}`);
  }

  return (await res.json()) as TokenResponse;
}

export async function revokeToken(token: string) {
  try {
    await fetch("https://developer.api.intuit.com/v2/oauth2/tokens/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: basicAuthHeader(),
      },
      body: JSON.stringify({ token }),
    });
  } catch {
    // Best-effort revoke
  }
}

export function buildAuthorizeUrl(state: string) {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID?.trim();
  if (!clientId) throw new Error("QuickBooks not configured");
  const redirectUri = `${appBaseUrl()}/api/quickbooks/oauth/callback`;
  const url = new URL("https://appcenter.intuit.com/connect/oauth2");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "com.intuit.quickbooks.accounting");
  url.searchParams.set("state", state);
  return url.toString();
}

export type StoredConnection = {
  user_id: string;
  realm_id: string;
  company_name: string | null;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string | null;
};

export function tokensFromResponse(tokens: TokenResponse) {
  const now = Date.now();
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    access_token_expires_at: new Date(now + tokens.expires_in * 1000).toISOString(),
    refresh_token_expires_at: tokens.x_refresh_token_expires_in
      ? new Date(now + tokens.x_refresh_token_expires_in * 1000).toISOString()
      : null,
  };
}
