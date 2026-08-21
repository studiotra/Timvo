import { TrayIcon } from "@tauri-apps/api/tray";
import { formatElapsed, type DesktopTimer } from "./api";

/** Compact menubar title (macOS). Prefer HH:MM once past an hour. */
function titleElapsed(startedAt: string, now = Date.now()): string {
  const full = formatElapsed(startedAt, now);
  const [h, m] = full.split(":");
  if (h !== "00") return `${Number(h)}:${m}`;
  return `${m}:${full.split(":")[2]}`;
}

export async function updateTrayTooltip(timer: DesktopTimer | null, now = Date.now()) {
  try {
    const tray = await TrayIcon.getById("main");
    if (!tray) return;
    if (!timer) {
      await tray.setTooltip("Timvo — idle");
      // Clear menubar text when idle (macOS)
      try {
        await tray.setTitle(null);
      } catch {
        /* Windows / unsupported */
      }
      return;
    }
    const label = [timer.clientName, timer.projectName].filter(Boolean).join(" · ");
    const elapsed = formatElapsed(timer.startedAt, now);
    await tray.setTooltip(`Timvo · ${elapsed} · ${label}`);
    try {
      await tray.setTitle(titleElapsed(timer.startedAt, now));
    } catch {
      /* Windows / unsupported */
    }
  } catch {
    // Not running inside Tauri, or tray not ready
  }
}
