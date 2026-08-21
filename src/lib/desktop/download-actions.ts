"use server";

import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import {
  DOWNLOAD_COOKIE,
  expectedDownloadToken,
} from "@/lib/desktop/download-access";

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
  const match = a.length === b.length && timingSafeEqual(a, b);

  if (!match) return { ok: false, error: "Invalid access code." };

  const token = expectedDownloadToken()!;
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
