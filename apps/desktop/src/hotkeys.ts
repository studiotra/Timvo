import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWindow } from "@tauri-apps/api/window";

/** macOS: ⌘⇧T · Windows/Linux: Ctrl+Shift+T */
export const HOTKEY_TOGGLE = "CommandOrControl+Shift+T";
/** macOS: ⌘⇧S · Windows/Linux: Ctrl+Shift+S */
export const HOTKEY_STOP = "CommandOrControl+Shift+S";
/** macOS: ⌘⇧Y · Windows/Linux: Ctrl+Shift+Y */
export const HOTKEY_SHOW = "CommandOrControl+Shift+Y";

export type HotkeyHandlers = {
  onToggle: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
};

export async function registerHotkeys(handlers: HotkeyHandlers): Promise<() => Promise<void>> {
  await unregisterAll().catch(() => undefined);

  await register(HOTKEY_TOGGLE, (event) => {
    if (event.state === "Pressed") void handlers.onToggle();
  });
  await register(HOTKEY_STOP, (event) => {
    if (event.state === "Pressed") void handlers.onStop();
  });
  await register(HOTKEY_SHOW, async (event) => {
    if (event.state !== "Pressed") return;
    try {
      const win = getCurrentWindow();
      await win.show();
      await win.setFocus();
    } catch {
      // ignore when not in Tauri
    }
  });

  return async () => {
    await unregisterAll().catch(() => undefined);
  };
}

export function hotkeyHint(mac: string, other: string) {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
  return isMac ? mac : other;
}
