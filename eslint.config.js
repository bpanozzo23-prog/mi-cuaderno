import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: [
      "**/node_modules/**", "dist/**", "dev-dist/**", "docs/**", "pipeline/spike/**",
      "pipeline/raw/**", "private-data/**", ".claude/**", ".agents/**", ".codex/**",
    ],
  },
  {
    files: ["src/**/*.{js,jsx}", "pipeline/{build,lib}/**/*.mjs", "*.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      ...js.configs.recommended.rules,
      // Destructuring a field away is intentional in migrations, projections and fixtures.
      "no-unused-vars": ["error", { ignoreRestSiblings: true }],
    },
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    // Only the established Hooks checks; compiler-oriented rules are outside this task.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["pipeline/{build,lib}/**/*.mjs", "*.config.js", "src/test/**/*.js", "src/**/*.test.{js,jsx}"],
    // Vitest APIs are imported explicitly; Node globals apply only to tooling and tests.
    languageOptions: { globals: globals.node },
  },
];
