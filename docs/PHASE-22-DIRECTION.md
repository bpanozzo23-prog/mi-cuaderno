# Phase 22 — Knowledge consolidation

**Status:** Implemented and verified locally 2026-08-12; not pushed or deployed.
**Origin:** The owner selected two consolidation ideas captured after Phase 21, then approved the
three-slice direction after an architecture review and a second review of the matching trade-offs.

## Outcome

Phase 22 makes relationships already implicit in the personal notebook visible and useful:

1. a saved word can show which saved phrases contain it, and a phrase can show which saved words
   it is built from;
2. overlapping personal English glosses can propose, but never create, a **Similar meaning**
   connection; and
3. owner-confirmed Similar meaning connections can feed a history-free recall session.

Everything derives from current personal entries, optional replaceable dictionary tables, and
existing ordinary links. Personal `SCHEMA_VERSION` stays 8. The phase adds no personal field,
preference, backup shape, event type, stored counter, score, schedule, automatic queue, dictionary
package, or background work. Accepted suggestions use the existing stored-once connection writer
and therefore retain ordinary link-creation timestamp behavior while writing no activity event.

## 22a — Phrase↔word containment

### Matching authority

Containment compares personal lexical entries with `form: "word"` against personal lexical entries
with `form: "phrase"`. Pages, word↔word pairs, phrase↔phrase pairs, dictionary-only entries, notes,
examples, and page prose do not participate.

The shared matcher works on Unicode letter-token runs and always through `normalize.js`, preserving
ñ and never matching inside a longer token. An exact normalized term run is considered before an
inflected form. An attached word whose `dictKey` resolves to a conjugable dictionary entry may also
match the same simple-tense, gerund, and participle forms that cloze uses. Perfect auxiliaries,
negative/pronoun helpers, and clitic-sized helper forms remain excluded exactly as they are in
cloze. An unattached word, missing dictionary, unresolved attachment, missing table, or failed
reference read falls back to term matching and never blocks lexical detail.

The initial fixed high-noise list is `a, al, con, de, del, e, el, en, la, las, le, les, lo, los,
me, nos, o, os, para, por, que, se, sin, te, u, un, una, unos, unas, y`. It suppresses those saved
word terms from containment; length alone never decides, so *ir* remains eligible.

### Ambiguity and intentional misses

A declarative containment row must not turn a form collision into two claims. Before admitting an
inflected surface, the runtime checks the installed dictionary's exact normalized form postings.
The inferred row appears only when that posting names exactly one distinct lemma and it is the
attached entry's lemma. A posting with no lemma, a different sole lemma, or more than one lemma
— *fui* for *ir* and *ser*, or a verb form colliding with a non-verb lemma — stays silent. This
confirmation check is reference-wide, not limited to which lemmas happen to be saved.
Literal term matches remain stronger than inferred conjugation matches.

Two true relationships are intentionally silent in v1:

- an ambiguous conjugated form is omitted rather than guessed, so *me fui de casa* may show neither
  *ir* nor *ser*; and
- a clitic-attached token such as *dármelo* does not match *dar*, because the safe whole-token
  matcher does not split inside the token.

Those are correctness trade-offs, not defects to repair with substring matching. Substring
matching would reintroduce the existing `casa`/`casada` and ñ hazards. Later work may add an
explicit morphology rule or an ambiguity UI, but it must not silently weaken token safety.

### Presentation

Lexical detail gains one **From your cuaderno** section immediately before the existing
**Connections** section. It remains a separate section with no relationship type, note editor, or
remove action.

- A word shows **Appears in your phrases**, an honest count, and navigable phrase rows.
- A phrase shows **Built on words you know**, navigable word rows, and the matched surface when it
  differs from the saved term, for example *dar · da*.

Rows follow the notebook's stable in-memory order. The section is absent when it has no containment
or suggestion content. All derivation is read-only and recalculates after the existing notebook
reload; no result is cached in personal storage.

## 22b — Possible similar meanings

### Pairwise suggestions, never automatic clusters

Suggestions compare personal lexical meanings pair by pair. They never union all senses of an
entry and never infer a transitive synonym cluster. For each gloss:

- normalize with the same case/accent rules used by personal search;
- tokenize Unicode words, retaining an apostrophe only inside a token;
- discard tokens shorter than three letters and a fixed English definition-boilerplate list
  including articles, infinitive/auxiliary words, pronouns, prepositions, *someone*, *something*,
  *one*, *used*, *usually*, and similar non-semantic scaffolding;
- use exact tokens only — no stemming, fuzzy matching, dictionary taxonomy, or AI; and
- qualify one meaning pair only when it shares at least one content token and its token-set Jaccard
  overlap is at least 0.5.

This admits *angry* ↔ *to be angry* and *angry* ↔ *angry; furious*, while rejecting the basic
*river bank* ↔ *financial bank* trap. Exact token-set equality ranks first, followed by more shared
tokens, stronger overlap, and stable normalized heading order. At most three suggestions render.
The row shows the candidate term, matching gloss, and shared token evidence so the owner can judge
the heuristic rather than trust an unexplained claim.

Part of speech is a best-effort rejection guard, not a prerequisite or strong authority. A
meaning's `posOverride` wins, then its entry's optional `pos`; a candidate is rejected only when
both compared meanings supply known, different values. Sparse or unattached entries therefore pass
through this check rather than being guessed.

Suggestions exclude the current item, Pages, normalized-identical Spanish headings, blank
meanings, and every pair already connected under any relationship in either physical direction.

### Confirmation and rejection memory

Suggestions live inside **From your cuaderno**, visually near but separate from **Connections**,
under **You also know…**. An explicit **Link as Similar meaning** action calls the ordinary
`linkItems` writer with `type: "similar_meaning"`. The writer remains the authority for preventing
self-links, reciprocal copies, and duplicate conceptual edges. After reload, the proposal
disappears and the ordinary connection appears in the existing Similar meaning group.

Phase 22 stores no rejection memory and offers no dismiss action. A false positive may reappear on
every visit until the underlying gloss changes, the pair becomes connected, or ranking moves it
below the three-row cap. This is an accepted v1 cost. A dismissed-pair list would be durable
personal preference state with backup and validation consequences and requires a later explicit
decision; it must not be smuggled into this phase as local storage or an unbacked cache.

## 22c — Confirmed-link recall

The Words & phrases hub gains a separate Similar-meaning recall action only when at least one
eligible prompt exists. Its cold start is deliberate: raw suggestions are not answer authority,
so a notebook with no confirmed Similar meaning connection has no semantic recall deck yet.

Every lexical item with at least one direct, owner-confirmed `similar_meaning` neighbor contributes
one prompt. The question shows the focal Spanish term and asks for another saved word or phrase
with a similar meaning. Reveal shows only its directly connected neighbors and their personal
glosses. A↔B plus B↔C never turns A and C into answers; symmetric does not mean transitive.

The session snapshots its eligible prompts at launch, offers 10, 20, or All when applicable,
shuffles the chosen prompts, uses reveal followed by **Again / Got it**, and offers one shuffled
missed-only round. It is self-graded: an answer outside the confirmed graph may still be valid, so
typed input cannot honestly mark it wrong. Starting, revealing, grading, repeating, finishing, or
leaving writes no event, timestamp, preference, score, review grade, Leitner movement, or schedule.

## Delivery and acceptance

Delivery order is 22a containment, 22b suggestions/confirmation, then 22c recall. Each slice is one
reviewable commit and leaves the app usable. The direction/brief/decision records travel with the
first slice; the report and current-status synchronization close the phase.

Acceptance requires:

- pure matcher/derivation tests for whole-token, accent, ñ, clitic, stop-list, ambiguity, optional
  dictionary, gloss-token, overlap, POS, ranking, exclusion, direct-edge, and no-transitivity rules;
- component/database tests proving navigation, the visually separate derived section, explicit
  confirmation, stored-once Similar meaning authority, no event, suggestion disappearance, the
  confirmed-link cold start, self-grading, and event-free recovery;
- deliberate red/green proofs for containment, suggestion authority, and recall's direct-edge
  boundary;
- the complete serial suite, production build, and `git diff --check`; and
- a disposable seeded 375×812 browser flow covering *dar* ↔ *me da igual*, a suppressed ambiguous
  form, one accepted suggestion, its move into Connections, recall launch/recovery, 44px actions,
  no horizontal overflow, and no console warnings/errors.

No owner browser data or backup is available to Codex. Matching quality is verified against
deliberately adversarial fixtures; real-notebook usefulness remains an owner observation after
release. A push to `main` was not part of implementation approval; the owner later approved it,
and GitHub Pages deployed `022e1b6` successfully on 2026-08-12. README Status, this direction/report,
and the two Improvement Ideas statuses were synchronized in the same session.
