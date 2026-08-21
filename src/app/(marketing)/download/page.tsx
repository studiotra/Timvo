import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DesktopDownloadPage } from "@/components/desktop-download-page";
import {
  getDesktopDownloadLinks,
  isDesktopDownloadUnlocked,
  unlockDesktopDownload,
} from "@/lib/desktop/download-access";

export const metadata: Metadata = {
  title: "Desktop download — Timvo",
  description: "Private Timvo desktop timer downloads.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ code?: string }> };

export default async function DownloadPage({ searchParams }: Props) {
  const configured = Boolean(process.env.DESKTOP_DOWNLOAD_ACCESS_CODE?.trim());
  const params = await searchParams;
  const codeFromUrl = params.code?.trim();

  if (configured && codeFromUrl) {
    const res = await unlockDesktopDownload(codeFromUrl);
    if (res.ok) redirect("/download");
  }

  const unlocked = configured ? await isDesktopDownloadUnlocked() : false;
  const links = getDesktopDownloadLinks();

  return (
    <DesktopDownloadPage
      unlocked={unlocked}
      configured={configured}
      macUrl={links.macUrl}
      winUrl={links.winUrl}
      releasesUrl={links.releasesUrl}
      versionLabel={links.versionLabel}
    />
  );
}
