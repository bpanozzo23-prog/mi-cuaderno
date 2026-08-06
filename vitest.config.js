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
    /**
     * One file at a time. Every verification claim in DECISIONS.md — 493/493 through
     * 827/827 — reports a "serial suite", but the command was parallel, so the run the
     * docs told you to make was never the run they certified. This closes that gap in the
     * one place every invocation reads, rather than in a script flag that `npx vitest run`
     * would bypass.
     *
     * It also settles a real false alarm: App.test.jsx's Phase 5a navigation test times
     * out intermittently under full-suite load (logged since Phase 10) and passes 15/15
     * alone. Raising testTimeout would have hidden it more cheaply — about 68s against
     * 225s — but the 5s bound is a live hang-detector in exactly this file, where a
     * Phase 4c test once passed against a deliberate break by racing an async handler.
     * Better to remove the contention and keep the bound sharp than to loosen the alarm.
     */
    fileParallelism: false,
  },
});
