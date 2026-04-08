import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const backendPort = process.env.BACKEND_PORT || "8001";
const frontendPort = parseInt(process.env.FRONTEND_PORT || "5174", 10);
const proxyTarget = `http://127.0.0.1:${backendPort}`;

/**
 * Public / tunnel friendly dev server:
 * - Proxies /api and /health to FastAPI so browsers use same origin as the page (ngrok, cloudflared, etc.).
 * - allowedHosts: accept tunnel Host headers.
 *
 * Start the stack with `./start_public_web.sh` so BACKEND_PORT / FRONTEND_PORT match this proxy.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: frontendPort,
    strictPort: false,
    allowedHosts: true,
    proxy: {
      "/api": { target: proxyTarget, changeOrigin: true },
      "/health": { target: proxyTarget, changeOrigin: true },
    },
  },
});
