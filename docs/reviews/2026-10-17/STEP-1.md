# Step 1 — safety fixes (work order)

**Status: item 1 done and deployed (2026-10-17); items 2–4 remain open and unapproved.** This
lists the first batch of fixes from the
[2026-10-17 reassessment](REASSESSMENT.md) so that a new session can pick one up without
re-reading the whole review. Every item still goes through the normal working agreement in
[`docs/AGENT-GUIDE.md`](../../AGENT-GUIDE.md): confirm the finding, propose a plan in plain
language, wait for the owner's approval, then implement.

Written 2026-10-17 by Claude Code (XPS, CLI) against `main` at `35cda8e`. Line numbers refer to
that commit.

## How to use this file

- **One item per session.** Items 1–4 are independent; do them in any order. Item 1 is the
  smallest and a good first session.
- **Start by confirming the finding still holds** on current `main`. The code may have moved.
- **No item should need a personal schema change.** If one seems to, stop and raise it, as the
  guide's tripwires require.
- **Acceptance for every item:** the complete serial suite passes (`npm test`, exit zero, no
  unhandled errors), `npm run build` passes, and each new test is shown to fail when the fix is
  removed. Owner browser data is never a test target.
- **Push only when the owner asks.** Pushing to `main` deploys.
- When an item is done, mark it below with the date and commit, and record the decision in
  `DECISIONS.md` as usual.

Suggested starter prompt for a new session (Claude Code or Codex):

> Follow docs/AGENT-GUIDE.md as usual, then read docs/reviews/2026-10-17/STEP-1.md. Work on
> item N only. The review was done at commit 35cda8e, so first confirm the finding still holds on
> current main. Then propose a plan in plain language and wait for my approval.

## Owner check before starting

Try **Ajustes → export a backup** on the phone. If no file appears, the notebook may already be
in the state described in item 2a, and item 2 becomes urgent. Today a failed export in Ajustes
shows no message at all (item 2b), so "nothing happened" is the symptom to look for.

| Item | What | Size | Needs an owner decision | Done |
|---|---|---|---|---|
| 1 | Run the tests before every deploy | Hours | Decided: pull-request testing deferred | 2026-10-17: `401bc74`; [Actions passed](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39057987662) |
| 2 | Backup safety: mutual-reference bug, rescue export, silent export failure, consistent snapshot | 2–4 days | Yes, for 2a (see options) | |
| 3 | All-or-nothing saves | 1–2 days | No | |
| 4 | Small fixes: overnight queue, English stopwords, load error, persistence flag, ñ helper | 1–2 days, plus a possible dictionary rebuild for 4e | 4e only, if a rebuild is needed | |

---

## Item 1 — Run the tests before every deploy

**Progress (2026-10-17).** The finding was confirmed on local `main` at `79e95b5`; after fetching,
`origin/main` was still the reviewed `35cda8e`, and the intervening local commit changed only
documentation. The owner approved item 1 with pull-request testing deferred. The workflow now runs
`npm test` immediately after `npm ci`, with the existing serial configuration and failure-blocking
deployment dependency.

Local verification passes: `npm test` reports **1,816/1,816 tests across 148 files** in 381.09
seconds, exit zero with no unhandled errors; `npm run build` passes with 2,145 modules transformed;
and `git diff --check` passes. A one-off YAML structure check rejects the committed workflow
without the test step and passes the updated workflow, including command order, the deployment
dependency and the absence of failure bypasses. No test files or dependencies were added. This
checks local configuration, not execution in GitHub Actions.

**Deployment verified (2026-10-17).** The owner requested the push, and local `main` and
`origin/main` matched at `401bc74` afterward. The first
[GitHub Actions run](https://github.com/bpanozzo23-prog/mi-cuaderno/actions/runs/39057987662)
passed **1,816/1,816 tests across 148 files** in 155.50 seconds, with no unhandled errors, before
the production build and Pages deployment both succeeded. README Status records the result in
the same publication session. Item 1 is done; pull-request testing remains deferred.

**Original problem.** [`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml) runs
`npm ci`, then `npm run build`, then publishes. It never runs `npm test`. The complete serial
suite is the project's acceptance gate, but nothing enforces it. A push from either machine, or an
edit made after the last local test run, can publish code the suite would reject.

**Change.** Add `npm test` between `npm ci` and `npm run build` in the `build` job, so a failing
test stops the deploy. `vitest.config.js` already forces one file at a time, so no extra flags are
needed.

**Options for the owner.**
- Also run the tests on pull requests (a separate job with no deploy). Useful if Codex or Claude
  Code ever open PRs; not needed while all work lands directly on `main`.
- Skipping the deploy for documentation-only pushes belongs to the later documentation work, not
  here. Keep this item to the test gate.

**Risks.** The suite takes about 7 minutes on the XPS. GitHub's runners may be faster or slower,
so watch the first run for timeouts; the guide's rule is to fix a timing problem, not to raise the
timeout. Deploys take several minutes longer.

**Done when.** The workflow runs the full suite before building; the first run after the change
passes in GitHub Actions (check the run, not only the push output); README Status records it in the
same session as the push, as the guide requires.

---

## Item 2 — Backup safety

Backups are the owner's disaster recovery (brief §10). Four related problems, best fixed together
because they touch the same files.

### 2a. Two pages that cite each other's Source captures can no longer be backed up

**Reproduced** on 2026-10-17 in an in-memory test outside the repository.

**Mechanism.** A Grammar example may cite a Source capture on another page. Saving that example
calls `ensureOutgoingPageConnection`
([`src/db/pageStructures.js`](../../../src/db/pageStructures.js#L87)), which makes sure the citing
page links to the source page. Because links are stored once, it also deletes any link in the
opposite direction. It does not check whether the other page's own Grammar examples depend on that
link.

1. Page A's example cites a capture on page B. A now links to B.
2. Page B's example cites a capture on page A. B now links to A, and A's link to B is deleted.
3. A's example still cites B, but A no longer links to B.

Backup validation requires an outgoing link for every external citation
([`src/db/backup.js`](../../../src/db/backup.js#L521)), so `buildBackup` throws: "The current
notebook could not be backed up: … sourceCaptureRef.pageId must also be an outgoing page link."
The Grammar editor offers captures from every Source-enabled page
([`GrammarSection.jsx`](../../../src/components/GrammarSection.jsx#L154)), so this is reachable
from the normal interface.

**Regression test.** This fails on `35cda8e` with exactly that error. It fits in
`src/db/pageStructures.test.js`, which already has the needed `beforeEach`; add `buildBackup` to its
imports. Adjust the middle step to the option chosen below.

```js
import { buildBackup } from "./backup.js";

it("keeps the notebook exportable when two pages cite each other's Source captures", async () => {
  const makePage = (title) => createItem(newPage({
    title,
    pageFocus: PAGE_FOCUSES.grammar,
    source: emptySource({ enabled: true, captures: [newSourceCapture({ text: `${title} passage` })] }),
    grammar: emptyGrammar({ enabled: true, sections: [newGrammarSection({ name: `${title} section` })] }),
  }));
  const a = await makePage("A");
  const b = await makePage("B");

  await saveGrammarExample(a.id, a.grammar.sections[0].id, {
    es: "Ejemplo A",
    sourceCaptureRef: { pageId: b.id, captureId: b.source.captures[0].id },
  });
  await saveGrammarExample(b.id, b.grammar.sections[0].id, {
    es: "Ejemplo B",
    sourceCaptureRef: { pageId: a.id, captureId: a.source.captures[0].id },
  });

  await expect(buildBackup()).resolves.toBeTruthy();
});
```

**Owner decision: how to fix it.**

- **Option A, guard (smaller, no rule change).** Refuse the second save with a clear message, for
  example that page A already cites this page and the two cannot cite each other. Nothing already
  saved changes. Downside: the owner cannot cite in both directions.
- **Option B, rule change.** Let an ordinary link in *either* direction authorize a capture
  citation. Both citations survive. This changes the rule in brief §§5/7 and the matching backup
  and save validation. It only loosens validation, so older backups stay valid, but historical
  validators must be checked so old backups are not judged by the new rule in a way that rejects
  them.

The reassessment suggests A now and B only if citing in both directions turns out to matter in
real use.

### 2b. A failed export is silent, and nothing can be exported at all

**Problem.** Every export path runs the full validator first: the normal export
(`buildBackup`, [`backup.js`](../../../src/db/backup.js#L54)), the safety export before a restore
([`Ajustes.jsx`](../../../src/components/Ajustes.jsx#L299)), and the export required before a
schema upgrade (`buildPreupgradeBackup`, [`preupgrade.js`](../../../src/db/preupgrade.js#L67)). One
invalid record, or a validator rule that is wrong, blocks all three. This already happened once:
commit `5fcfd8e` (2026-08-14) fixed the owner's v8→v9 upgrade gate failing on valid parts of speech.

In Ajustes the failure is also silent. `handleExport`
([`Ajustes.jsx`](../../../src/components/Ajustes.jsx#L246)) has no error handling, and the shared
`Button` does not catch errors, so the owner gets no file and no message.

**Change.**
- Show export failures in Ajustes with the validator's first errors in plain words.
- Add a **rescue export**, offered when validation fails: the raw personal stores as they are, with
  the API key still removed, plus the validation errors, under a clearly different file name (for
  example `mi-cuaderno-RESCUE-…json`). It must be obviously not a normal backup. Restore keeps
  refusing anything that does not validate, so a rescue file is something to repair, not to
  restore blindly.
- Offer the same rescue path in the schema-upgrade gate
  ([`SchemaUpgradeGate.jsx`](../../../src/components/SchemaUpgradeGate.jsx)) so a validator problem
  can never trap the owner's data behind an upgrade.

**Done when.** Tests prove that a notebook that fails validation still produces a rescue file,
that the file never contains the API key (the brief's Secrets rule asks for an explicit test), and
that restore still refuses it.

### 2c. Read the backup as one consistent snapshot

`buildBackup` reads items, events and preferences with three separate reads
([`backup.js`](../../../src/db/backup.js#L55)), and `buildPreupgradeBackup` does the same
([`preupgrade.js`](../../../src/db/preupgrade.js#L83)). Wrap each in one read-only transaction so a
save in the middle cannot produce a mixed snapshot. Small; do it alongside 2a/2b.

---

## Item 3 — All-or-nothing saves

**Problem.** `createItem` and `updateItem` ([`src/db/items.js`](../../../src/db/items.js#L210),
[line 230](../../../src/db/items.js#L230)) write the item, then write its `create`/`edit` event as
a separate step. `updateItem`'s meaning-connection check also runs outside the write. If the event
write fails, the item is saved but the call fails.

**Visible effect.** The Diario editor
([`JournalEditor.jsx`](../../../src/components/JournalEditor.jsx#L114)) only remembers a new entry's
id after `createItem` succeeds. If the item was written but the event failed, the editor shows
"Couldn't save — try again," and trying again creates a second entry.

**Change.** Put the fresh reads, the checks, the item write and the event write in one Dexie
transaction, as `addDictionaryMeaningsToItem` and `deleteItem` already do in the same file. Keep the
`requestPersistence()` call outside the transaction. Some callers already run inside a wider
transaction; Dexie reuses a parent transaction when the tables match, but check each caller.

Also review two-step UI sequences with the same problem, such as create-then-link in the page
workspace ([`CollectionPage.jsx`](../../../src/components/CollectionPage.jsx#L412)): if the link
fails, the new item exists unlinked.

**Done when.** Failure-injection tests (make the event write throw) show that neither the item nor
the event is left behind, and that a Diario retry does not duplicate the entry. The existing
rollback test in `src/db/pageStructures.test.js` (around line 680) is a model.

---

## Item 4 — Small fixes

Each is hours of work. They can go in one session as separate commits, or be split.

### 4a. Repaso shows yesterday's queue after midnight

`Repaso.jsx` computes the review state, streak and suggestions in `useMemo` blocks keyed only on
items and events ([`Repaso.jsx`](../../../src/components/Repaso.jsx#L205),
[line 247](../../../src/components/Repaso.jsx#L247)). The functions take `today` as a default
argument ([`review.js`](../../../src/lib/review.js#L193), `stats.js` `streakFrom`), so "today" is
frozen at the last data change. A phone app left open overnight shows yesterday's due list and
streak until something is edited.

**Change.** Track the local day in state (refresh on `visibilitychange` and focus, and when the
date rolls over), pass it explicitly into `deriveReviewState`, `deriveDictSuggestions` and
`streakFrom`, and add it to the memo dependencies. The guide bans fake timers, so test by injecting
the day rather than moving the clock.

### 4b. English searches with common words find nothing

The pipeline leaves stopwords such as "the," "of" and "in" out of the English index
([`pipeline/build/07-package.mjs`](../../../pipeline/build/07-package.mjs#L178)). The app's English
search requires a hit for every word of the query and returns nothing as soon as one is missing
([`src/db/ref/search.js`](../../../src/db/ref/search.js#L96)). So "the house" or "in front of" find
no English match.

**Change.** Move the stopword list into `src/lib/` and import it from both places, the way the
pipeline already imports `normalize.js`. Drop stopwords from the query before intersecting. Keep
the exact-phrase ranking. Decide what a stopword-only query returns (probably nothing from the
English tier). If the list itself is unchanged, the shipped dictionary does not need rebuilding.

### 4c. A failed notebook load has no error state

`useNotebook` ([`src/useNotebook.js`](../../../src/useNotebook.js)) has no error handling, so a
failed read leaves the app on "Opening your cuaderno…"
([`App.jsx`](../../../src/App.jsx#L633)) indefinitely. Add an error state with a plain message and
a retry.

### 4d. A restored backup stops the app asking a new phone to protect its storage

`requestPersistence` ([`src/lib/persistence.js`](../../../src/lib/persistence.js#L13)) skips the
browser request whenever the stored preference says `true`. That preference is restored from
backups, so after moving to a new phone the app never asks the new browser to keep its data. Check
`navigator.storage.persisted()` instead of trusting the stored value.

### 4e. The conjugation analyzer strips ñ

`withoutWrittenAccents` ([`src/lib/conjugationPatterns.js`](../../../src/lib/conjugationPatterns.js#L272))
removes every combining mark, including the tilde in ñ. It is used for pronominal affirmative
commands and gerunds (lines 283 and 301), so "bañándose" becomes "banando" before it is compared
with the regular model. This breaks the project's first tripwire. Remove only the written accent
(the combining acute, U+0301) and add a pronominal ñ test.

**Check before finishing.** The pipeline imports this analyzer
([`06b-conjugation-patterns.mjs`](../../../pipeline/build/06b-conjugation-patterns.mjs)), and its
output became the conjugation-family data inside the shipped dictionary. Find out whether any
shipped ñ verb was classified differently. If so, correcting the shipped data means a new dataset
revision, which is a separate owner decision. The raw pipeline downloads are not on the XPS
(`pipeline/raw/` is gitignored), so a rebuild there would start with downloading. Fixing the app
code does not have to wait for that decision.

---

## Not in Step 1

These came out of the same review but belong later:

- Pipeline downloader integrity (half-downloaded files accepted as cached; checksums reused when
  sizes match, [`01-download.mjs`](../../../pipeline/build/01-download.mjs#L38)): before the next
  dictionary rebuild.
- Dictionary changes in Ajustes not refreshing an open Cuaderno search, and the missing
  `dictionary` dependency in `Cuaderno.jsx` (line 325): reported by Codex, not yet checked; fits the
  lint and code tidy-up work (reassessment Step 5).
- Documentation reset, brief replacement, usage review and refactors: reassessment Steps 2–5.

## Evidence

- [REASSESSMENT.md](REASSESSMENT.md), section 8 (bugs) and section 9 (data layer).
- Codex reviews: [code](codex/1-code.md) (items 3, 4c, 4e), [data model](codex/3-data-model.md)
  (items 2, 3, 4a, 4b, 4d), [repository](codex/4-repository.md) (item 1).
