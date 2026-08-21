import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

/** Silently install updates when a newer GitHub Release exists. */
export async function checkForAppUpdates(): Promise<void> {
  try {
    const update = await check();
    if (!update) return;
    await update.downloadAndInstall();
    await relaunch();
  } catch {
    // Dev builds / missing latest.json — ignore
  }
}
