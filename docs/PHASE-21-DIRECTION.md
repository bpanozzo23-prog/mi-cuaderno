# Phase 21 — What to notice and conjugation families

**Status:** Implemented and verified locally 2026-08-12; not pushed or deployed.
**Origin:** The owner approved the active improvement idea after a teaching-first product
discussion and an architecture review against the replaceable reference-data seam.

## Outcome

The dictionary's existing Conjugation card starts with a compact **What to notice** lesson.
It explains memorable patterns from the verb's actual shipped paradigm, shows contrastive forms,
and, when at least two shipped lemmas share that exact classified behavior, links to useful sibling
verbs. The lesson comes before discovery; it remains useful with an older r2 dictionary whose
family index is absent.

This feature applies only to dictionary verb details. Personal-entry notices, a standalone family
browser, Gym curriculum changes, stored learning state, and scheduling remain outside Phase 21.
Personal `SCHEMA_VERSION` stays 8; personal records, backups, preferences, and event types do not
change.

## 1 — Evidence before packaging

One pure browser-safe analyzer is shared by the pipeline, package verifier, and UI. It compares
actual simple-tense cells and principal parts with regular hablar/comer/vivir baselines. Pattern
definitions have stable IDs, plain-language lessons, fixed priorities, complete evidence recipes,
and overlap rules. Missing required evidence means no assignment; lemma spelling alone never
establishes a family.

An explicit post-conjugation sweep runs before packaging. It counts distinct NFC/case-folded
lemmas rather than entry rows, rejects conflicting tables for duplicate lemmas, records regular,
classified, singleton, overlapping, and unclassified results, and gates the 100 most frequent
unique conjugated lemmas. Every top-100 verb must receive a concrete notice or its regular-class
summary; none may receive an empty teaching result.

- Two or more distinct lemmas make a discoverable family.
- One lemma remains a teaching-only notice with no sibling claim.
- Zero lemmas leave the unused definition out of the package.
- Visible evidence never selects collapsed `vosotros`; the normal order is yo, nosotros, then
  ustedes/ellos. An intrinsic command lesson may use tú. Gerunds and participles are slotless.
- Related observations merge into one lesson. In particular, pedir's present, preterite, and
  gerund evidence becomes one e→i notice: *pido · pedimos · pidieron*.

The first full sweep covers 1,795 conjugable entry rows / 1,771 distinct lemmas. It finds 1,148
fully regular paradigms, 591 lemmas with at least one concrete notice, and 32 lower-frequency
unclassified paradigms. The top-100 gate passes with 47 regular summaries and 53 noticed verbs.
The shipped corpus contains only one u→ue lemma, *jugar*, so that lesson is deliberately not
presented as a family.

## 2 — Replaceable reference package

Runtime derivation over all tables was rejected. Sibling discovery would otherwise scan and sort
the replaceable dictionary at lookup time or duplicate an unverified reverse map in application
code. The pipeline is already the authority that precomputes the form and English lookup stores,
so it also materializes family membership and verifies it in both directions.

- Dataset `kaikki-es-2026-07-25-r3` uses the same downloaded sources as r2 and changes only build
  logic and derived reference artifacts. Dictionary `formatVersion` remains 1.
- Conjugable entry rows carry optional, non-indexed `conjugationPatternIds[]`.
- Reference declaration v2 adds `patternFamilies: "id"`; each discoverable row is
  `{ id, memberIds[] }`.
- Duplicate normalized lemmas choose the best-frequency entry, then stable ID. Members are
  pre-sorted by frequency, Spanish lemma order, and ID.
- Lookup bulk-gets only the current IDs' family rows and member entries. It never scans entries,
  adds a multi-entry index, or performs a runtime frequency sort.
- The A/B installer includes the fifth store in every chunk transaction and wipe, verifies its
  physical count before flipping the active pointer, and retains the old serving slot on failure.

Opening an existing v1/r2 reference database under the v2 declaration creates an empty family
store without migrating or rewriting its four existing stores. Its local teaching analysis works;
sibling lists are simply absent and no orphan warning appears. If an older app marked r3 installed
while ignoring the unfamiliar fifth store, the newer app compares the installed manifest count
with the physical store and offers an atomic same-version repair.

## 3 — Dictionary interaction

**What to notice** sits at the top of the existing Conjugation card. Two prioritized notices show
initially; a local disclosure reveals the rest. Each uses up to three exact forms and semantic
emphasis on the relevant letters, including an unchanged contrast where useful.

Regular verbs receive one quiet line naming the appropriate hablar/comer/vivir anchor. They do
not load or show the enormous regular family. A discoverable notice shows **Shares this pattern**:
four siblings initially, up to 20 after expansion, plus an honest remaining count. The current
normalized lemma and duplicate lemmas are excluded.

Personal items affect display order only. Direct `dictKey` matches and old keys resolving through
`previousIds` stable-partition ahead of the pipeline order and receive **In your cuaderno**; no
personal row is rewritten. Sibling buttons use ordinary dictionary navigation, open at the top,
record the existing session-deduplicated view, and leave the original verb one Atrás action away.

## Delivery and acceptance

Delivery proceeds as: shared analyzer and corpus gate; r3 packaging and proof; reference v2 and
repair flow; dictionary lesson/discovery UI; integration, documentation, package regeneration, and
phone closeout. Named tests protect the three regular anchors, pedir's merged lesson, the
no-vosotros evidence rule, complete top-100 teaching output, and singleton no-sibling behavior.

Package verification recomputes every entry assignment, proves exact reverse family equality,
ordering, resolvable members, known IDs, manifest counts, and evidence ranges. Reference tests
cover v1 opening under v2, interrupted/successful replacement, all-five-store cleanup, r2 fallback,
and same-version repair. UI and App tests cover disclosure limits, familiar/alias ordering,
regular/singleton omission, sibling navigation, Atrás, and view deduplication.

Closeout requires focused tests, one deliberately broken classifier/package proof, one deliberately
broken navigation/ordering proof, the complete serial suite, production build, package verifier,
`git diff --check`, and a disposable seeded 375×812 numerical browser pass. Repository r3 artifacts
are prepared locally; pushing and deployment require a separate owner request.
