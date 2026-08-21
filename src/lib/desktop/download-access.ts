"use server";

import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

export const DOWNLOAD_COOKIE = "timvo_desktop_dl";

function expectedToken(): string | null {
  const code = process.env.DESKTOP_DOWNLOAD_ACCESS_CODE?.trim();
  if (!code) return null;
  return createHash("sha256").update(`timvo-dl:${code}`).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function isDesktopDownloadUnlocked(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const jar = await cookies();
  const got = jar.get(DOWNLOAD_COOKIE)?.value;
  if (!got) return false;
  return safeEqualHex(got, expected);
}

export async function unlockDesktopDownload(
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const expectedCode = process.env.DESKTOP_DOWNLOAD_ACCESS_CODE?.trim();
  if (!expectedCode) {
    return { ok: false, error: "Downloads are not configured yet." };
  }

  const submitted = code.trim();
  if (!submitted) return { ok: false, error: "Enter the access code." };

  const a = Buffer.from(submitted);
  const b = Buffer.from(expectedCode);
  // length mismatch → fail without leaking length via timingSafeEqual throw
  const match =
    a.length === b.length && timingSafeEqual(a, b);

  if (!match) return { ok: false, error: "Invalid access code." };

  const token = expectedToken()!;
  const jar = await cookies();
  jar.set(DOWNLOAD_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/download",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { ok: true };
}

export async function lockDesktopDownload() {
  const jar = await cookies();
  jar.delete(DOWNLOAD_COOKIE);
}

export function getDesktopDownloadLinks(): {
  macUrl: string | null;
  winUrl: string | null;
  releasesUrl: string;
  versionLabel: string | null;
} {
  return {
    macUrl: process.env.DESKTOP_DOWNLOAD_MAC_URL?.trim() || null,
    winUrl: process.env.DESKTOP_DOWNLOAD_WIN_URL?.trim() || null,
    releasesUrl:
      process.env.DESKTOP_DOWNLOAD_RELEASES_URL?.trim() ||
      "https://github.com/studiotra/Timvo/releases",
    versionLabel: process.env.DESKTOP_DOWNLOAD_VERSION?.trim() || null,
  };
}
