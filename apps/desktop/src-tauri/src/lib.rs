use std::sync::Mutex;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State, WindowEvent,
};
use tauri::webview::WebviewWindowBuilder;
use tauri::WebviewUrl;
use tauri_plugin_deep_link::DeepLinkExt;

struct AppState {
    /// Base URL for the Timvo web app (no trailing slash).
    app_url: Mutex<String>,
    /// Role home path (`/` or `/org`).
    home_path: Mutex<String>,
    /// Latest Supabase tokens from the timer UI (for SSO into the workspace webview).
    access_token: Mutex<Option<String>>,
    refresh_token: Mutex<Option<String>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            app_url: Mutex::new("https://www.timvo.work".into()),
            home_path: Mutex::new("/".into()),
            access_token: Mutex::new(None),
            refresh_token: Mutex::new(None),
        }
    }
}

fn percent_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

fn lock_str(m: &Mutex<String>) -> String {
    m.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

fn is_org_home(home: &str) -> bool {
    home.starts_with("/org")
}

fn safe_app_path(path: &str, fallback: &str) -> String {
    let p = path.trim();
    if p.starts_with('/') && !p.starts_with("//") {
        p.to_string()
    } else {
        fallback.to_string()
    }
}

fn role_path(home: &str, solo: &str, org: &str) -> String {
    if is_org_home(home) {
        org.to_string()
    } else {
        solo.to_string()
    }
}

/// Map `timvo://…` URLs to in-app paths.
fn path_from_deep_link(url: &url::Url, home: &str) -> String {
    let host = url.host_str().unwrap_or("");
    let path = url.path();
    let query_path = url
        .query_pairs()
        .find(|(k, _)| k == "path")
        .map(|(_, v)| v.to_string());

    if let Some(p) = query_path {
        return safe_app_path(&p, home);
    }

    match host {
        "dashboard" | "home" | "app" => home.to_string(),
        "logs" => role_path(home, "/logs", "/org/logs"),
        "clients" => role_path(home, "/clients", "/org/clients"),
        "invoices" => {
            if is_org_home(home) {
                "/org/timesheets".to_string()
            } else {
                "/invoices".to_string()
            }
        }
        "settings" => role_path(home, "/settings", "/org/settings"),
        "timer" => home.to_string(),
        "org" => "/org".to_string(),
        "open" => safe_app_path(path, home),
        "" | "localhost" => {
            if path.len() > 1 {
                safe_app_path(path, home)
            } else {
                home.to_string()
            }
        }
        _ => {
            if path.len() > 1 {
                safe_app_path(path, home)
            } else {
                // timvo://logs style already handled; unknown host → home
                home.to_string()
            }
        }
    }
}

fn build_handoff_url(state: &AppState, next_path: &str) -> String {
    let base = lock_str(&state.app_url).trim_end_matches('/').to_string();
    let access = state
        .access_token
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    let refresh = state
        .refresh_token
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();

    let next = safe_app_path(next_path, "/");

    match (access, refresh) {
        (Some(access), Some(refresh)) => {
            // Tokens in the query string — WKWebView often drops URL fragments on native navigate.
            format!(
                "{base}/auth/desktop?desktop=1&next={}&access_token={}&refresh_token={}",
                percent_encode(&next),
                percent_encode(&access),
                percent_encode(&refresh),
            )
        }
        _ => format!("{base}/login?desktop=1&next={}", percent_encode(&next)),
    }
}

fn build_direct_url(state: &AppState, next_path: &str) -> String {
    let base = lock_str(&state.app_url).trim_end_matches('/').to_string();
    let next = safe_app_path(next_path, "/");
    if next.contains('?') {
        format!("{base}{next}&desktop=1")
    } else {
        format!("{base}{next}?desktop=1")
    }
}

fn show_timer(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn open_or_focus_workspace(
    app: &tauri::AppHandle,
    state: &AppState,
    next_path: &str,
) -> Result<(), String> {
    let next = safe_app_path(next_path, &lock_str(&state.home_path));

    // Already open → navigate in-place (cookies from first handoff).
    if let Some(window) = app.get_webview_window("workspace") {
        let url = build_direct_url(state, &next);
        let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;
        window.navigate(parsed).map_err(|e| e.to_string())?;
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    let url = build_handoff_url(state, &next);
    let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;

    WebviewWindowBuilder::new(app, "workspace", WebviewUrl::External(parsed))
        .title("Timvo")
        .inner_size(1280.0, 800.0)
        .min_inner_size(960.0, 640.0)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn handle_deep_link(app: &tauri::AppHandle, raw: &str) {
    let Ok(url) = url::Url::parse(raw) else {
        return;
    };
    if url.scheme() != "timvo" {
        return;
    }
    let Some(state) = app.try_state::<AppState>() else {
        return;
    };
    let home = lock_str(&state.home_path);
    let path = path_from_deep_link(&url, &home);

    // timvo://timer → focus native timer instead of webview
    if url.host_str() == Some("timer") {
        show_timer(app);
        return;
    }

    let _ = open_or_focus_workspace(app, state.inner(), &path);
}

#[tauri::command]
fn set_workspace_session(
    app_url: String,
    access_token: Option<String>,
    refresh_token: Option<String>,
    home_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let cleaned = app_url.trim().trim_end_matches('/').to_string();
    if !cleaned.is_empty() {
        *state.app_url.lock().unwrap_or_else(|e| e.into_inner()) = cleaned;
    }
    if let Some(home) = home_path {
        let home = safe_app_path(home.trim(), "/");
        *state.home_path.lock().unwrap_or_else(|e| e.into_inner()) = home;
    }
    *state.access_token.lock().unwrap_or_else(|e| e.into_inner()) = access_token
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    *state.refresh_token.lock().unwrap_or_else(|e| e.into_inner()) = refresh_token
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    Ok(())
}

#[tauri::command]
fn open_workspace(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    path: Option<String>,
) -> Result<(), String> {
    let home = lock_str(&state.home_path);
    let next = path
        .as_deref()
        .map(str::trim)
        .filter(|p| p.starts_with('/') && !p.starts_with("//"))
        .unwrap_or(home.as_str());
    open_or_focus_workspace(&app, state.inner(), next)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            set_workspace_session,
            open_workspace
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Regular);
            }

            #[cfg(any(windows, target_os = "linux"))]
            {
                let _ = app.deep_link().register_all();
            }

            let app_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    handle_deep_link(&app_handle, &url.to_string());
                }
            });

            // Cold-start deep link
            if let Ok(Some(urls)) = app.deep_link().get_current() {
                for url in urls {
                    handle_deep_link(app.handle(), &url.to_string());
                }
            }

            let show_timer_i =
                MenuItem::with_id(app, "show_timer", "Show Timer", true, None::<&str>)?;
            let dashboard_i =
                MenuItem::with_id(app, "nav_dashboard", "Dashboard", true, None::<&str>)?;
            let logs_i = MenuItem::with_id(app, "nav_logs", "Logs", true, None::<&str>)?;
            let clients_i =
                MenuItem::with_id(app, "nav_clients", "Clients", true, None::<&str>)?;
            let invoices_i =
                MenuItem::with_id(app, "nav_invoices", "Invoices", true, None::<&str>)?;
            let settings_i =
                MenuItem::with_id(app, "nav_settings", "Settings", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Timvo", true, None::<&str>)?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(
                app,
                &[
                    &show_timer_i,
                    &sep1,
                    &dashboard_i,
                    &logs_i,
                    &clients_i,
                    &invoices_i,
                    &settings_i,
                    &sep2,
                    &quit_i,
                ],
            )?;

            let _tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("Timvo Timer")
                .on_menu_event(|app, event| {
                    let Some(state) = app.try_state::<AppState>() else {
                        return;
                    };
                    let home = lock_str(&state.home_path);
                    match event.id.as_ref() {
                        "show_timer" => show_timer(app),
                        "nav_dashboard" => {
                            let _ = open_or_focus_workspace(app, state.inner(), &home);
                        }
                        "nav_logs" => {
                            let path = role_path(&home, "/logs", "/org/logs");
                            let _ = open_or_focus_workspace(app, state.inner(), &path);
                        }
                        "nav_clients" => {
                            let path = role_path(&home, "/clients", "/org/clients");
                            let _ = open_or_focus_workspace(app, state.inner(), &path);
                        }
                        "nav_invoices" => {
                            let path = if is_org_home(&home) {
                                "/org/timesheets".to_string()
                            } else {
                                "/invoices".to_string()
                            };
                            let _ = open_or_focus_workspace(app, state.inner(), &path);
                        }
                        "nav_settings" => {
                            let path = role_path(&home, "/settings", "/org/settings");
                            let _ = open_or_focus_workspace(app, state.inner(), &path);
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_timer(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Timvo desktop");
}
