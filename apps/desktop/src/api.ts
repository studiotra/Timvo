import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const apiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3000";

if (!supabaseUrl || !supabaseAnon) {
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnon ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "timvo-desktop-auth",
  },
});

export type DesktopTimer = {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  serviceName?: string;
  taskName?: string;
  startedAt: string;
};

export type DesktopClient = {
  id: string;
  name: string;
  isOrg: boolean;
  source: "solo" | "org_staff" | "org_assigned";
  orgName?: string;
};
export type DesktopProject = { id: string; name: string; clientId: string };
export type DesktopService = { id: string; name: string };
export type DesktopTask = { id: string; name: string };

async function authHeaders(session: Session): Promise<HeadersInit> {
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function apiGet<T>(path: string, session: Session): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    headers: await authHeaders(session),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

async function apiPost<T>(path: string, session: Session, body?: unknown): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: await authHeaders(session),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export async function fetchMe(session: Session) {
  return apiGet<{
    user: {
      id: string;
      email: string | null;
      fullName: string | null;
      businessName: string | null;
      accountType: string | null;
    };
    organization: { id: string; name: string | null; role: string } | null;
  }>("/api/desktop/me", session);
}

export async function fetchClients(session: Session) {
  return apiGet<{ clients: DesktopClient[] }>("/api/desktop/clients", session);
}

export async function fetchProjects(session: Session, clientId: string) {
  return apiGet<{ projects: DesktopProject[] }>(
    `/api/desktop/projects?clientId=${encodeURIComponent(clientId)}`,
    session
  );
}

export async function fetchServices(session: Session) {
  return apiGet<{ services: DesktopService[] }>("/api/desktop/services", session);
}

export async function fetchTasks(session: Session, projectId: string, serviceId: string) {
  return apiGet<{ tasks: DesktopTask[] }>(
    `/api/desktop/tasks?projectId=${encodeURIComponent(projectId)}&serviceId=${encodeURIComponent(serviceId)}`,
    session
  );
}

export async function fetchTimer(session: Session) {
  return apiGet<{ timer: DesktopTimer | null }>("/api/desktop/timer", session);
}

export async function startTimer(
  session: Session,
  payload: { projectId: string; serviceId?: string; taskId?: string; description?: string }
) {
  return apiPost<{ timer: DesktopTimer | null }>("/api/desktop/timer/start", session, payload);
}

export async function stopTimer(session: Session) {
  return apiPost<{ minutes: number }>("/api/desktop/timer/stop", session);
}

export function formatElapsed(startedAt: string, now = Date.now()): string {
  const ms = Math.max(0, now - new Date(startedAt).getTime());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
