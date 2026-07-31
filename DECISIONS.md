# Decisions log

One line per meaningful choice: date — decision — reason.

- 2026-07-30 — Adopted brief v3 (`docs/mi-cuaderno-project-brief-v3.md`) as the contract; Phase 0 + 0.5 plan approved before any code. — §2 working agreement.
- 2026-07-30 — Repo is public, named `mi-cuaderno`. — GitHub Pages is free on public repos; personal data never enters the repo (it lives only in the device's browser storage).
- 2026-07-30 — Brief and prototype committed under `docs/`. — They contain no personal data and are the project's reference documentation.
- 2026-07-30 — Node.js 24 LTS installed via winget; single toolchain for both the app and the data pipeline. — One language (JS) everywhere; no Python dependency.
- 2026-07-30 — Tailwind v4 via the `@tailwindcss/vite` plugin. — Current stable major; no PostCSS config file needed.
- 2026-07-30 — PWA service worker uses `autoUpdate`. — App shell updates silently on redeploy; notebook data is unaffected because it lives in browser storage, not in the app files.
- 2026-07-30 — Manifest `theme_color`/`background_color` = paper `#FAF9F4`; icons are generated placeholders (blue tile, serif M, highlighter swipe). — Matches prototype design tokens; icons swappable later without config changes.
- 2026-07-30 — App-code license: deferred (repo currently has no LICENSE file). — Data licenses are the urgent part (§4); code license decision can wait for the owner.
- 2026-07-30 — `npm audit`'s 8 "high" findings left unfixed. — All are one dependency chain inside the build tool (`vite-plugin-pwa` → workbox → old `brace-expansion`); build-time only, nothing ships to the app; the offered fix downgrades the PWA plugin.
