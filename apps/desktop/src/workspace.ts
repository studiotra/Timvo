import { invoke } from "@tauri-apps/api/core";
import type { Session } from "@supabase/supabase-js";

/** Web app origin used for the hybrid workspace webview. */
export function appBaseUrl(): string {
  return (
    (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "") ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
    "https://www.timvo.work"
  );
}

export type WorkspaceSessionOpts = {
  session: Session | null;
  /** `/` for contractor, `/org` for agency primary. */
  homePath?: string;
};

/** Keep Rust tray/menu handoff in sync with the timer session. */
export async function syncWorkspaceSession({
  session,
  homePath = "/",
}: WorkspaceSessionOpts): Promise<void> {
  try {
    await invoke("set_workspace_session", {
      appUrl: appBaseUrl(),
      accessToken: session?.access_token ?? null,
      refreshToken: session?.refresh_token ?? null,
      homePath,
    });
  } catch {
    // Browser preview / non-Tauri
  }
}

/** Open (or focus) the full Timvo web app in the workspace window. */
export async function openWorkspace(path = "/"): Promise<void> {
  try {
    await invoke("open_workspace", { path });
  } catch (err) {
    const base = appBaseUrl();
    const next = path.startsWith("/") ? path : "/";
    window.open(`${base}${next === "/" ? "" : next}`, "_blank");
    console.warn("open_workspace failed, opened browser", err);
  }
}

export async function openLogs(isOrg: boolean): Promise<void> {
  await openWorkspace(isOrg ? "/org/logs" : "/logs");
}
