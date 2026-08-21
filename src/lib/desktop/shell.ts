/** True when running inside the Timvo desktop hybrid webview. */
export function isDesktopShell(): boolean {
  if (typeof document === "undefined") return false;
  if (document.cookie.split("; ").some((c) => c.startsWith("timvo_desktop=1"))) {
    return true;
  }
  try {
    return new URLSearchParams(window.location.search).get("desktop") === "1";
  } catch {
    return false;
  }
}
