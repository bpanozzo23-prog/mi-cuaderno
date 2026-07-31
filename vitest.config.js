import { defineConfig } from "vitest/config";

// Deliberately separate from vite.config.js: the tests exercise plain logic modules
// and do not need the React or PWA plugins.
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.js"],
    // The pipeline is tested too: its conjugation extractor decides what ~1,250 verbs
    // conjugate like, and a wrong tag mapping is invisible in the output until a learner
    // reads a wrong form.
    include: ["src/**/*.test.js", "pipeline/**/*.test.mjs"],
  },
});
