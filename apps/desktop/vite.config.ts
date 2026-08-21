import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;
// Dev webview loads http://localhost:1420 — absolute `/` base.
// Production Tauri custom protocol needs relative `./` assets.
const isTauriDebug = process.env.TAURI_ENV_DEBUG === "true";

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  base: isTauriDebug ? "/" : "./",
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !isTauriDebug ? "esbuild" : false,
    sourcemap: isTauriDebug,
  },
}));
