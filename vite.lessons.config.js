import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Separate origin and entry: never boot the notebook or register its service worker here.
export default defineConfig(({ command, isPreview }) => {
  if (command === "build" || isPreview) {
    throw new Error("Lessons A1 is development-only. Use npm run dev:lessons; production integration is not enabled.");
  }
  return {
    root: fileURLToPath(new URL("./src/features/lessons/preview/", import.meta.url)),
    base: "/",
    publicDir: false,
    plugins: [react(), tailwindcss()],
    server: { host: "127.0.0.1", port: 5174, strictPort: true },
  };
});
