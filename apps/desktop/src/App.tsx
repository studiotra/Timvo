import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  apiBase,
  fetchClients,
  fetchMe,
  fetchProjects,
  fetchServices,
  fetchTasks,
  fetchTimer,
  formatElapsed,
  startTimer,
  stopTimer,
  supabase,
  type DesktopClient,
  type DesktopProject,
  type DesktopService,
  type DesktopTask,
  type DesktopTimer,
} from "./api";
import {
  hotkeyHint,
  registerHotkeys,
} from "./hotkeys";
import { loadLastSelection, saveLastSelection } from "./prefs";
import { subscribeTimerSync } from "./sync";
import { updateTrayTooltip } from "./tray";
import { checkForAppUpdates } from "./updater";

type WorkspaceFilter = "all" | "team" | "solo";

function clientLabel(c: DesktopClient): string {
  if (c.source === "org_staff") return `Team · ${c.name}`;
  if (c.source === "org_assigned") return `${c.orgName ?? "Org"} · ${c.name}`;
  return `Solo · ${c.name}`;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [orgLabel, setOrgLabel] = useState<string | null>(null);
  const [workspaceFilter, setWorkspaceFilter] = useState<WorkspaceFilter>("all");
  const [syncLabel, setSyncLabel] = useState("Connecting…");

  const [clients, setClients] = useState<DesktopClient[]>([]);
  const [projects, setProjects] = useState<DesktopProject[]>([]);
  const [services, setServices] = useState<DesktopService[]>([]);
  const [tasks, setTasks] = useState<DesktopTask[]>([]);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [timer, setTimer] = useState<DesktopTimer | null>(null);
  const [now, setNow] = useState(Date.now());

  const sessionRef = useRef(session);
  const timerRef = useRef(timer);
  const busyRef = useRef(busy);
  const selectionRef = useRef({ clientId, projectId, serviceId, taskId, description });

  sessionRef.current = session;
  timerRef.current = timer;
  busyRef.current = busy;
  selectionRef.current = { clientId, projectId, serviceId, taskId, description };

  useEffect(() => {
    void checkForAppUpdates();
  }, []);

  useEffect(() => {
    const last = loadLastSelection();
    if (last) {
      setClientId(last.clientId);
      setProjectId(last.projectId);
      setServiceId(last.serviceId ?? "");
      setTaskId(last.taskId ?? "");
      setDescription(last.description ?? "");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!timer) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer]);

  useEffect(() => {
    void updateTrayTooltip(timer);
    if (!timer) return;
    const id = window.setInterval(() => {
      void updateTrayTooltip(timer);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [timer]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const [me, clientsRes, servicesRes] = await Promise.all([
          fetchMe(session),
          fetchClients(session),
          fetchServices(session),
        ]);
        if (cancelled) return;
        setUserLabel(me.user.fullName || me.user.email || "Signed in");
        setOrgLabel(
          me.organization
            ? `${me.organization.name ?? "Organization"} · ${me.organization.role}`
            : null
        );
        const hasTeam = clientsRes.clients.some((c) => c.isOrg);
        const hasSolo = clientsRes.clients.some((c) => !c.isOrg);
        if (hasTeam && !hasSolo) setWorkspaceFilter("team");
        else if (!hasTeam && hasSolo) setWorkspaceFilter("solo");
        setClients(clientsRes.clients);
        setServices(servicesRes.services);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    setSyncLabel("Live sync on");
    return subscribeTimerSync(session, session.user.id, (next) => {
      setTimer(next);
      setSyncLabel("Synced");
    });
  }, [session]);

  useEffect(() => {
    if (!session || !clientId) {
      setProjects([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchProjects(session, clientId);
        if (cancelled) return;
        setProjects(res.projects);
        if (!res.projects.some((p) => p.id === projectId)) {
          setProjectId(res.projects[0]?.id ?? "");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load projects");
      }
    })();
    return () => {
      cancelled = true;
    };
    // intentionally omit projectId — only reload when client changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, clientId]);

  useEffect(() => {
    if (!session || !projectId || !serviceId) {
      setTasks([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchTasks(session, projectId, serviceId);
        if (cancelled) return;
        setTasks(res.tasks);
        if (!res.tasks.some((t) => t.id === taskId)) setTaskId("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load tasks");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, projectId, serviceId]);

  async function doStart(payload: {
    projectId: string;
    serviceId?: string;
    taskId?: string;
    description?: string;
    clientId?: string;
  }) {
    const s = sessionRef.current;
    if (!s || busyRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const res = await startTimer(s, {
        projectId: payload.projectId,
        serviceId: payload.serviceId,
        taskId: payload.taskId,
        description: payload.description,
      });
      setTimer(res.timer);
      saveLastSelection({
        clientId: payload.clientId || selectionRef.current.clientId,
        projectId: payload.projectId,
        serviceId: payload.serviceId,
        taskId: payload.taskId,
        description: payload.description,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start timer");
    } finally {
      setBusy(false);
    }
  }

  async function doStop() {
    const s = sessionRef.current;
    if (!s || busyRef.current) return;
    if (!timerRef.current) return;
    setBusy(true);
    setError(null);
    try {
      await stopTimer(s);
      setTimer(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not stop timer");
    } finally {
      setBusy(false);
    }
  }

  async function doToggle() {
    if (timerRef.current) {
      await doStop();
      return;
    }
    const sel = selectionRef.current;
    const last = loadLastSelection();
    const projectId = sel.projectId || last?.projectId;
    if (!projectId) {
      setError("Pick a project first, then use the hotkey.");
      return;
    }
    await doStart({
      clientId: sel.clientId || last?.clientId || "",
      projectId,
      serviceId: sel.serviceId || last?.serviceId || undefined,
      taskId: sel.taskId || last?.taskId || undefined,
      description: sel.description || last?.description || undefined,
    });
  }

  useEffect(() => {
    if (!session) return;
    let cleanup: (() => Promise<void>) | undefined;
    let cancelled = false;
    (async () => {
      try {
        cleanup = await registerHotkeys({
          onToggle: () => doToggle(),
          onStop: () => doStop(),
        });
      } catch (e) {
        if (!cancelled) {
          console.warn("Hotkeys unavailable:", e);
          setSyncLabel((prev) => prev);
        }
      }
    })();
    return () => {
      cancelled = true;
      void cleanup?.();
    };
    // handlers use refs — register once per session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function onSignIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signError) setError(signError.message);
  }

  async function onSignOut() {
    await supabase.auth.signOut();
    setTimer(null);
    setUserLabel(null);
    setOrgLabel(null);
    void updateTrayTooltip(null);
  }

  async function onRefresh() {
    if (!session) return;
    setBusy(true);
    try {
      const res = await fetchTimer(session);
      setTimer(res.timer);
      setSyncLabel("Synced");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  const toggleHint = hotkeyHint("⌘⇧T", "Ctrl+Shift+T");
  const stopHint = hotkeyHint("⌘⇧S", "Ctrl+Shift+S");
  const showHint = hotkeyHint("⌘⇧Y", "Ctrl+Shift+Y");

  const hasTeamClients = clients.some((c) => c.isOrg);
  const hasSoloClients = clients.some((c) => !c.isOrg);
  const filteredClients = clients.filter((c) => {
    if (workspaceFilter === "team") return c.isOrg;
    if (workspaceFilter === "solo") return !c.isOrg;
    return true;
  });

  if (booting) {
    return (
      <div className="app">
        <div className="brand">Timvo</div>
        <p className="sub">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app">
        <div>
          <div className="brand">Timvo</div>
          <p className="sub">Desktop timer — same clock as the web app</p>
        </div>
        <form className="panel stack" onSubmit={onSignIn}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="sub">API: {apiBase}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div>
        <div className="brand">Timvo</div>
        <p className="sub">
          {userLabel}
          {orgLabel ? ` · ${orgLabel}` : ""} · {syncLabel}
        </p>
      </div>

      <div className="panel timer-card">
        {timer ? (
          <>
            <div className="timer-elapsed">{formatElapsed(timer.startedAt, now)}</div>
            <div className="timer-meta">
              {[timer.clientName, timer.projectName, timer.serviceName, timer.taskName]
                .filter(Boolean)
                .join(" · ")}
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn-danger" onClick={() => void doStop()} disabled={busy}>
                Stop
              </button>
              <button className="btn btn-secondary" onClick={() => void onRefresh()} disabled={busy}>
                Sync
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="timer-elapsed" style={{ color: "var(--muted)" }}>
              00:00:00
            </div>
            <div className="timer-meta">No timer running</div>
          </>
        )}
      </div>

      {!timer && (
        <div className="panel stack">
          {hasTeamClients && hasSoloClients && (
            <div className="filter-row">
              {(
                [
                  ["all", "All"],
                  ["team", "Team"],
                  ["solo", "Solo"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`filter-chip${workspaceFilter === id ? " active" : ""}`}
                  onClick={() => {
                    setWorkspaceFilter(id);
                    setClientId("");
                    setProjectId("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <label>
            Client
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Select client…</option>
              {filteredClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Project
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={!clientId}
            >
              <option value="">Select project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Service (optional)
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">None</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {serviceId && (
            <label>
              Task (optional)
              <select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">None</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Note (optional)
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button
            className="btn btn-primary"
            onClick={() =>
              void doStart({
                clientId,
                projectId,
                serviceId: serviceId || undefined,
                taskId: taskId || undefined,
                description: description || undefined,
              })
            }
            disabled={busy || !projectId}
          >
            {busy ? "Starting…" : "Start timer"}
          </button>
        </div>
      )}

      {error && timer && <p className="error">{error}</p>}

      <div className="panel stack hotkeys-panel">
        <div className="hotkey-row">
          <span>Toggle</span>
          <kbd>{toggleHint}</kbd>
        </div>
        <div className="hotkey-row">
          <span>Stop</span>
          <kbd>{stopHint}</kbd>
        </div>
        <div className="hotkey-row">
          <span>Show window</span>
          <kbd>{showHint}</kbd>
        </div>
        <p className="sub" style={{ margin: 0 }}>
          On macOS, grant Accessibility for Timvo if shortcuts don’t fire.
        </p>
      </div>

      <div className="footer">
        <span>Close hides to tray</span>
        <button className="btn btn-secondary" style={{ flex: "0 0 auto" }} onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
