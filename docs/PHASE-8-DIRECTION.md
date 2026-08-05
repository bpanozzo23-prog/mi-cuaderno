# Phase 8 — Words & phrases hub (direction)

Approved 2026-08-04. This is the decision-complete scope. Implementation outcomes live in
[PHASE-8-REPORT.md](PHASE-8-REPORT.md); the reasoning lines live in `DECISIONS.md` under Phase 8.

## Why

Phase 4z gave pages a dedicated home, and in doing so it quietly changed what the Cuaderno root
list is. With `páginas` navigating away and Diario entries excluded from browsing, the root became
*mostly* the words-and-phrases list — while still doubling as the global, dictionary-merged search
surface.

That left lexical items with the generic list. It can sort and filter only by what is true of any
item: tags, recency, and three completeness views. It knows nothing about what makes a word a word.

Meanwhile the notebook already derives a great deal about lexical items with nowhere to browse it.
Where a word lives — this Collection group, that Source capture, this Grammar example — ships today
and is visible one item at a time on a detail screen. So does its Leitner state.

Phase 8 gives words and phrases the same treatment pages got: a calm, focused surface over data
that already exists.

## Owner decisions

1. **One hub, not two.** Words and phrases are one type told apart by `form`. A single hub with
   All / Words / Phrases chips, mirroring the Pages hub's role chips. Two hubs would duplicate the
   surface for one field's difference and force a guess about where *dar con* lives.
2. **`palabras` and `frases` navigate**, exactly as `páginas` already does. The root keeps `todo`
   plus global search and becomes honestly one thing: the single list spanning both layers (§8).
3. **All four organizing abilities ship together:** where a word lives; a read-only learning
   signal; the completeness views; the A–Z index with pinned vocabulary.
4. **No dictionary in hub search.** The hub searches personal vocabulary only. An empty result
   offers a hand-off carrying the query to Cuaderno's mixed list.

## What the hub is

A focused `‹ Cuaderno / Words & phrases / +` header replacing the app header, then:

- **Form chips** — All / Words / Phrases, via the existing `matchesTypeFilter`.
- **Refine**, hidden behind one control reporting its active count:
  - *Where it lives* — Anywhere · In a Collection · From a Source · In a Grammar guide ·
    Not in any page yet
  - *Learning* — Any · Highlighted · In review · Due today · Retired
  - *View* — the existing completeness views
  - *Order* — Recently touched · Recently added · A–Z
  - *Tag* — the existing contextual tag counts
- **Pinned first while browsing**, never while searching: pinning must not override §8 relevance.
- **A–Z letter groups**, only in A–Z order. Accents fold onto the base letter; ñ is its own letter
  after n; digits and punctuation share a trailing `#`.
- **Cards** showing the term with its form/part-of-speech suffix, the highlighter for a tricky
  word, personal glosses, one learning badge, the active page contexts, tags and a pin.

## Boundaries held

- **Repaso remains the only review flow.** The hub shows and filters review state; it never grades.
- **No relationship-type filter and no relationship hub**, upholding the Phase 4t decision. Changing
  that is a separate owner decision.
- **No third content type, no folders, no saved or remembered filter state, no stored counters.**
  Every control is visit-local and every number is derived at render.
- **No orphan badge.** An honest one needs an async resolve per item through the §5 alias map. The
  card may say nothing; it must never say "orphaned" without having asked.

## Storage

`SCHEMA_VERSION` stays **5**. Pinned vocabulary adds one preference key, `pinnedLexicalIds`:

- backups already dump and restore preferences generically, with no allowlist;
- the pin validator is `hasOwnProperty`-guarded, so backups written before this release still
  validate;
- no item shape changes and no migration is involved.

Deleting an item cleans both pin lists in the same transaction — a stale id would make the backup
validator reject the export, not merely show a phantom card.

## Verification

The full serial suite, the production build, `git diff --check`, deliberate red/green failure
proofs on the load-bearing logic, and a disposable 375×812 browser closeout that inspects no owner
data.
