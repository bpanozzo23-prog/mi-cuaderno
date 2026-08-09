import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// base must match the GitHub Pages sub-path: https://<user>.github.io/mi-cuaderno/
export default defineConfig({
  base: "/mi-cuaderno/",
  server: { port: Number(process.env.PORT) || 5173 },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // The dictionary is an explicit, owner-initiated download that lands in IndexedDB
        // (brief §11) — the service worker must not quietly precache 22 MB of chunks on
        // first visit. globPatterns is already js/css/html-only by default; both entries
        // are stated rather than inherited so a later Workbox default cannot change it.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        globIgnores: ["**/dict/**"],
        navigateFallbackDenylist: [/^\/mi-cuaderno\/dict\//],
      },
      manifest: {
        name: "Mi cuaderno",
        short_name: "Mi cuaderno",
        description: "Personal Spanish notebook",
        lang: "es",
        display: "standalone",
        // Mirrors --color-paper (src/index.css) by hand. The manifest is generated at build
        // time and read by the OS, so it cannot reference a CSS variable. Change them together.
        background_color: "#F6F4EC",
        theme_color: "#F6F4EC",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
});
