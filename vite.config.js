import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// base must match the GitHub Pages sub-path: https://<user>.github.io/mi-cuaderno/
export default defineConfig({
  base: "/mi-cuaderno/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Mi cuaderno",
        short_name: "Mi cuaderno",
        description: "Personal Spanish notebook",
        lang: "es",
        display: "standalone",
        background_color: "#FAF9F4",
        theme_color: "#FAF9F4",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
});
