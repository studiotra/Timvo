import type { Session } from "@supabase/supabase-js";
import {
  fetchTimer,
  startTimer,
  stopTimer,
  type DesktopTimer,
} from "./api";

const STORAGE_KEY = "timvo-desktop-offline-queue-v1";

export type QueuedStart = {
  id: string;
  type: "start";
  at: number;
  projectId: string;
  serviceId?: string;
  taskId?: string;
  description?: string;
  clientId?: string;
};

export type QueuedStop = {
  id: string;
  type: "stop";
  at: number;
};

export type QueuedAction = QueuedStart | QueuedStop;

function readQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedAction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function queueLength(): number {
  return readQueue().length;
}

export function enqueueStart(payload: Omit<QueuedStart, "id" | "type" | "at">): void {
  const q: QueuedAction[] = readQueue().filter((a) => a.type !== "start");
  q.push({
    id: crypto.randomUUID(),
    type: "start",
    at: Date.now(),
    ...payload,
  });
  writeQueue(q);
}

export function enqueueStop(): void {
  const q: QueuedAction[] = readQueue().filter((a) => a.type !== "stop");
  q.push({ id: crypto.randomUUID(), type: "stop", at: Date.now() });
  writeQueue(q);
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|network|offline|load failed|econnrefused|timeout/i.test(msg);
}

/**
 * Replay queued start/stop in order. Returns remaining queue length and last known timer.
 */
export async function flushOfflineQueue(
  session: Session
): Promise<{ flushed: number; timer: DesktopTimer | null }> {
  const q = readQueue();
  if (!q.length) {
    const current = await fetchTimer(session).catch(() => ({ timer: null as DesktopTimer | null }));
    return { flushed: 0, timer: current.timer };
  }

  const remaining: QueuedAction[] = [];
  let flushed = 0;
  let timer: DesktopTimer | null = null;

  for (const action of q) {
    try {
      if (action.type === "start") {
        const res = await startTimer(session, {
          projectId: action.projectId,
          serviceId: action.serviceId,
          taskId: action.taskId,
          description: action.description,
        });
        timer = res.timer;
      } else {
        await stopTimer(session);
        timer = null;
      }
      flushed += 1;
    } catch (err) {
      if (isNetworkError(err)) {
        remaining.push(action, ...q.slice(q.indexOf(action) + 1));
        break;
      }
      // Drop bad action (e.g. already stopped) and continue
      flushed += 1;
    }
  }

  writeQueue(remaining);

  if (timer === null && remaining.length === 0) {
    try {
      const res = await fetchTimer(session);
      timer = res.timer;
    } catch {
      /* ignore */
    }
  }

  return { flushed, timer };
}

export function watchOnline(onOnline: () => void): () => void {
  const handler = () => onOnline();
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
