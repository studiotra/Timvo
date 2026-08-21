import { TrayIcon } from "@tauri-apps/api/tray";
import { formatElapsed, type DesktopTimer } from "./api";

export async function updateTrayTooltip(timer: DesktopTimer | null) {
  try {
    const tray = await TrayIcon.getById("main");
    if (!tray) return;
    if (!timer) {
      await tray.setTooltip("Timvo — idle");
      return;
    }
    const label = [timer.clientName, timer.projectName].filter(Boolean).join(" · ");
    await tray.setTooltip(`Timvo · ${formatElapsed(timer.startedAt)} · ${label}`);
  } catch {
    // Not running inside Tauri, or tray not ready
  }
}
