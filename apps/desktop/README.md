# Timvo Desktop (Tauri 2.9)

Menubar/tray timer that uses the same `time_logs` data as the web app and Slack.

## Prerequisites

- Rust toolchain (`rustup`) — https://rustup.rs
- Xcode Command Line Tools (macOS): `xcode-select --install`
- Node 20+
- Running Timvo web app (for `/api/desktop/*`) **or** point at production

> Note: `rustc` / `cargo` must be on your PATH (`source "$HOME/.cargo/env"`).

## Setup

```bash
cd "/path/to/Invoice Web App/apps/desktop"
cp .env.example .env
# Fill VITE_SUPABASE_* and VITE_API_BASE_URL (local :3000 or https://www.timvo.work)
npm install
npm run tauri dev
```

From the **repo root**:

```bash
npm run desktop:dev
```

## Hybrid shell (Phase 1–2)

Desktop keeps a **native timer + tray**. Tray / **Open Timvo workspace** loads the full web app in a second window (`workspace`), with session handoff via `/auth/desktop`.

| Window | Role |
|--------|------|
| `main` | Timer UI (this Vite app) |
| `workspace` | Full Timvo web (`VITE_APP_URL`) |

### Tray menu
Show Timer · Dashboard · Logs · Clients · Invoices · Settings · Quit

Org users get `/org/…` routes (Invoices → Timesheets).

### Deep links (`timvo://`)
Works after install (scheme registered). Examples:

| Link | Opens |
|------|--------|
| `timvo://dashboard` | Home (`/` or `/org`) |
| `timvo://logs` | Logs |
| `timvo://clients` | Clients |
| `timvo://invoices` | Invoices / org timesheets |
| `timvo://settings` | Settings |
| `timvo://timer` | Native timer window |
| `timvo://open?path=/reports` | Safe absolute path |

Set `VITE_APP_URL` (defaults to `VITE_API_BASE_URL`) to local `:3000` or `https://www.timvo.work`.

### Phase 3 — polish
- **OS notifications** on start/stop, idle (30m), long-running (every 2h), offline queue sync
- **Menubar elapsed** via tray title (macOS) + live tooltip
- **Offline queue** for start/stop — replays when back online
- Apple notarization / Windows code signing still require developer certs (not in this phase)

## Hotkeys

| Action | macOS | Windows / Linux |
|--------|-------|-----------------|
| Toggle timer | ⌘⇧T | Ctrl+Shift+T |
| Stop | ⌘⇧S | Ctrl+Shift+S |
| Show window | ⌘⇧Y | Ctrl+Shift+Y |

On macOS, enable **System Settings → Privacy & Security → Accessibility → Timvo** if shortcuts don’t work.

## Sync

- Supabase Realtime on `time_logs` (migration `20250830000000_time_logs_realtime.sql`)
- Poll every 15s + refresh on focus
- Tray tooltip shows running timer state

## Org / Team

Org staff see Team clients first; dual-role users get **All / Team / Solo** filters. Assigned contractor projects appear as `Org · Client`.

## Private downloads (web)

Unlisted page: `/download` (not in nav). Gate with `DESKTOP_DOWNLOAD_ACCESS_CODE`.

Share: `https://www.timvo.work/download` + code, or one-click  
`https://www.timvo.work/download?code=YOUR_CODE`

Set on Vercel: `DESKTOP_DOWNLOAD_ACCESS_CODE`, optional `DESKTOP_DOWNLOAD_MAC_URL` / `DESKTOP_DOWNLOAD_WIN_URL`.

## Releases (Phase 3)

Workflow: `.github/workflows/release-desktop.yml`  
Trigger: push tag `desktop-v*` or **Actions → Release Desktop → Run workflow**.

### GitHub secrets

| Secret | Purpose |
|--------|---------|
| `TAURI_SIGNING_PRIVATE_KEY` | Updater private key (contents of `.secrets/timvo-updater.key`) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Key password (empty if none) |
| `APPLE_CERTIFICATE` | Base64 Developer ID Application `.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | `.p12` password |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: …` |
| `APPLE_ID` | Apple ID email |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | 10-char Team ID |
| `KEYCHAIN_PASSWORD` | Temporary CI keychain password |

Without Apple secrets, CI still builds **unsigned** drafts (Gatekeeper will warn).

Public updater key is already in `src-tauri/tauri.conf.json`. Private key must stay in `.secrets/` / GitHub — never commit it.

### Local production build

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat ../../.secrets/timvo-updater.key)"
npm run tauri build
```

## API

All routes require `Authorization: Bearer <supabase_access_token>`:

- `GET /api/desktop/me`
- `GET /api/desktop/clients`
- `GET /api/desktop/projects?clientId=`
- `GET /api/desktop/services`
- `GET /api/desktop/tasks?projectId=&serviceId=`
- `GET /api/desktop/timer`
- `POST /api/desktop/timer/start` `{ projectId, serviceId?, taskId?, description? }`
- `POST /api/desktop/timer/stop`
