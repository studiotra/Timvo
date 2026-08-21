import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

let permissionReady: Promise<boolean> | null = null;

async function ensurePermission(): Promise<boolean> {
  if (!permissionReady) {
    permissionReady = (async () => {
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const perm = await requestPermission();
          granted = perm === "granted";
        }
        return granted;
      } catch {
        return false;
      }
    })();
  }
  return permissionReady;
}

export async function notify(title: string, body?: string): Promise<void> {
  try {
    if (!(await ensurePermission())) return;
    sendNotification({ title, body });
  } catch {
    // Non-Tauri / denied
  }
}

export async function notifyTimerStarted(label: string): Promise<void> {
  await notify("Timvo timer started", label || "Tracking time");
}

export async function notifyTimerStopped(label?: string): Promise<void> {
  await notify("Timvo timer stopped", label || "Time saved to your logs");
}

export async function notifyIdleReminder(): Promise<void> {
  await notify("Still working?", "No timer is running. Start one from the Timvo tray.");
}

export async function notifyLongRunning(elapsedLabel: string): Promise<void> {
  await notify("Timer still running", `Elapsed ${elapsedLabel}. Stop it when you’re done.`);
}

export async function notifyOfflineQueued(action: "start" | "stop"): Promise<void> {
  await notify(
    "Timvo offline",
    action === "start"
      ? "Start queued — will sync when you’re back online."
      : "Stop queued — will sync when you’re back online."
  );
}

export async function notifyQueueFlushed(count: number): Promise<void> {
  if (count <= 0) return;
  await notify("Timvo back online", `Synced ${count} queued timer action${count === 1 ? "" : "s"}.`);
}
