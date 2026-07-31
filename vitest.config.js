import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.js: the tests exercise plain logic modules
// and do not need the React or PWA plugins.
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.js"],
  },
});
