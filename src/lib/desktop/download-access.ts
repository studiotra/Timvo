import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

export const DOWNLOAD_COOKIE = "timvo_desktop_dl";

export function expectedDownloadToken(): string | null {
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
  const expected = expectedDownloadToken();
  if (!expected) return false;
  const jar = await cookies();
  const got = jar.get(DOWNLOAD_COOKIE)?.value;
  if (!got) return false;
  return safeEqualHex(got, expected);
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
