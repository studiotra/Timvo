import type { Session } from "@supabase/supabase-js";
import { fetchTimer, type DesktopTimer } from "./api";
import { supabase } from "./api";

const POLL_MS = 15_000;

/**
 * Keep desktop timer in sync with web / Slack / other clients.
 * Uses Supabase Realtime on time_logs + a light poll fallback.
 */
export function subscribeTimerSync(
  session: Session,
  userId: string,
  onTimer: (timer: DesktopTimer | null) => void
): () => void {
  let cancelled = false;
  let debounce: number | undefined;

  const refresh = async () => {
    try {
      const res = await fetchTimer(session);
      if (!cancelled) onTimer(res.timer);
    } catch {
      // keep last known state on transient errors
    }
  };

  const scheduleRefresh = () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => {
      void refresh();
    }, 250);
  };

  void refresh();

  const channel = supabase
    .channel(`desktop-timer-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "time_logs",
        filter: `user_id=eq.${userId}`,
      },
      () => scheduleRefresh()
    )
    .subscribe();

  const poll = window.setInterval(() => {
    void refresh();
  }, POLL_MS);

  const onFocus = () => {
    void refresh();
  };
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refresh();
  });

  return () => {
    cancelled = true;
    window.clearTimeout(debounce);
    window.clearInterval(poll);
    window.removeEventListener("focus", onFocus);
    void supabase.removeChannel(channel);
  };
}
