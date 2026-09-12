import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// App version drives the PWA cache name: every release gets a distinct
// cache, so a new deployment can never serve a stale precached shell.
// CI passes the git tag as VITE_APP_VERSION so the cache always matches the
// released version even if package.json drifts; locally package.json wins.
const APP_VERSION = process.env.VITE_APP_VERSION || JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src"),
    },
  },
  build: {
    // Android System WebView on many devices is older than Chrome 107 —
    // target it explicitly so the APK never ships unparseable JS.
    target: "chrome87",
    cssTarget: "chrome87",
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "ViP Yemen — منصة التوظيف والتسويق العقاري والإلكتروني",
        short_name: "ViP Yemen",
        description:
          "منصة ViP Yemen الشاملة للتوظيف والتسويق العقاري والتسويق الإلكتروني والخدمات البرمجية في اليمن.",
        lang: "ar",
        dir: "rtl",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#121685",
        theme_color: "#c9a227",
        categories: ["business", "shopping", "productivity"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,woff,ttf,svg,png,ico}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        // Versioned cacheId → every release gets a distinct cache name
        // (vip-yemen-<version>-precache-…), so a new deployment can never
        // serve a stale precached shell. cleanupOutdatedCaches then purges
        // the previous version's caches automatically. skipWaiting +
        // clientsClaim activate the new SW instantly; registerSW's
        // takeover-reload shows the fresh build to open pages immediately.
        cacheId: `vip-yemen-${APP_VERSION}`,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst"
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ],
    server: {
      host: "0.0.0.0",
      port: Number(process.env.PORT) || 5173,
      hmr: false
    }
}));