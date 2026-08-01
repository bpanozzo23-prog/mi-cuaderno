import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Deliberately separate from vite.config.js: the tests do not need the PWA plugin.
// The React plugin is here only for the handful of component tests (*.test.jsx); every
// other test exercises a plain logic module.
export default defineConfig({
  plugins: [react()],
  test: {
    // Node stays the default: 200-odd tests run in it today and none of them need a DOM.
    // Component tests opt into jsdom with a per-file @vitest-environment pragma, which is
    // cheaper than making every test pay for a document it never touches.
    environment: "node",
    setupFiles: ["./src/test/setup.js"],
    // The pipeline is tested too: its conjugation extractor decides what ~1,250 verbs
    // conjugate like, and a wrong tag mapping is invisible in the output until a learner
    // reads a wrong form.
    include: ["src/**/*.test.js", "src/**/*.test.jsx", "pipeline/**/*.test.mjs"],
  },
});
