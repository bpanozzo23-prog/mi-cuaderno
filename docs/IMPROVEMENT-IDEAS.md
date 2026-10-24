# Improvement ideas

Open ideas live here with their reasoning, potential benefits, tradeoffs and later discussion.
They are possibilities, not an approved roadmap. Before planning, read the [agent guide](AGENT-GUIDE.md),
[CURRENT](CURRENT.md), [PRODUCT](PRODUCT.md), [ARCHITECTURE](ARCHITECTURE.md) and relevant decisions,
and inspect the implementation.

## How to use this document

- Keep active and owner-deferred ideas with their full context in this file. Detailed approved
  work may graduate to a direction/work document; link it here. Approval alone changes status to
  **in progress**, not **done**. Completed work keeps a linked index row; archive its body only
  after preserving every still-open possibility here.
- Use **idea**, **in progress**, or **done**. The Deferred group preserves explicit owner choices
  without turning them into implementation approval. Historical statuses live in the archive.
- Retain description, context, options, expected value, risks, technical dependencies and later
  discussion. Date new captures and substantive reviews; keep owner statements distinct from agent estimates.
- **Size** and **Touches** are provisional agent estimates for owner review. Small means an
  afternoon, medium a session or two, large a phase. Estimate lightweight and durable variants
  separately. A schema or new-event estimate is a design possibility, not authorization.
- **Owner interest** in the index is **Not set** until the owner chooses **want soon**, **curious**
  or **someday**. Existing interest prose remains useful context and is not silently converted
  into a rank. Rank is separate from status and owner deferral.
- The [owner response, section 15](reviews/2026-10-17/REASSESSMENT.md#15-owner-response-2026-10-17)
  welcomes experiments. Evidence notes inform choices; real use is not a general gate. Preserve
  technical input/quality requirements where an idea needs data to work, and explicit owner choices.
  The usage review is withdrawn. Deployment status belongs in CURRENT.

## Idea index

### Active

| Idea | Status | Owner interest |
|---|---|---|
| [Separate classroom-diario space](#separate-classroom-diario-space) | idea | Not set |
| [In-app AI prompt drafting](#in-app-ai-prompt-drafting) | idea | Not set |
| [Personal prompt store](#personal-prompt-store) | idea | Not set |
| [Diario follow-up AI requests](#diario-follow-up-ai-requests) | idea | Not set |
| [Edge-kind visual vocabulary](#edge-kind-visual-vocabulary) | idea | Not set |
| [Wander constellation (one-hop map)](#wander-constellation-one-hop-map) | idea | Not set |
| [Connection cluster browsing](#connection-cluster-browsing) | idea | Not set |
| [Graph texture in Estadísticas](#graph-texture-in-estadísticas) | idea | Not set |
| [Moment-of-learning micro-visuals](#moment-of-learning-micro-visuals) | idea | Not set |
| [Global graph visualization](#global-graph-visualization) | idea | Not set |
| [Evidence-backed synonym/antonym proposals](#evidence-backed-synonymantonym-proposals) | idea | Not set |
| [Evidence-backed Page-to-Page proposals](#evidence-backed-page-to-page-proposals) | idea | Not set |
| [Optional AI connection review](#optional-ai-connection-review) | idea | Not set |
| [AI Ask and Tidy with a shared review](#ai-ask-and-tidy-with-a-shared-review) | in progress | want soon |
| [Conjugation catalog extensions](#conjugation-catalog-extensions) | idea | Not set |
| [Monolingual recall (Spanish usage cues)](#monolingual-recall-spanish-usage-cues) | idea | Not set |
| [Retired-word spot checks](#retired-word-spot-checks) | idea | Not set |
| [Near-duplicate consolidation view](#near-duplicate-consolidation-view) | idea | Not set |
| [Dictionary word-family explorer](#dictionary-word-family-explorer) | idea | Not set |
| [Select text to look up](#select-text-to-look-up) | idea | Not set |
| [Paste a vocabulary list](#paste-a-vocabulary-list) | idea | Not set |
| [PWA app shortcuts](#pwa-app-shortcuts) | idea | Not set |
| ["Did you mean" search suggestions](#did-you-mean-search-suggestions) | idea | Not set |
| [Tag hubs](#tag-hubs) | idea | Not set |
| [Review→writing bridge](#reviewwriting-bridge) | idea | Not set |
| [Time-boxed mixed session](#time-boxed-mixed-session) | idea | Not set |
| [Review forecast](#review-forecast) | idea | Not set |
| [Confusion-pair drills](#confusion-pair-drills) | idea | Not set |
| [Dictation cards](#dictation-cards) | idea | Not set |
| [Frequency coverage](#frequency-coverage) | idea | Not set |
| [Saved views](#saved-views) | idea | Not set |
| [Personal-content provenance](#personal-content-provenance) | idea | Not set |
| [Taller follow-ups](#taller-follow-ups) | idea | Not set |
| [Non-verb drill extensions and practice home](#non-verb-drill-extensions-and-practice-home) | idea | Not set |
| [Containment and Similar proposal follow-ups](#containment-and-similar-proposal-follow-ups) | idea | Not set |
| [Share post-attach quick actions](#share-post-attach-quick-actions) | idea | Not set |
| [Historia performance and thin-biography lens](#historia-performance-and-thin-biography-lens) | idea | Not set |
| [Neighborhood browsing follow-ups](#neighborhood-browsing-follow-ups) | idea | Not set |
| [Tag maintenance follow-ups](#tag-maintenance-follow-ups) | idea | Not set |
| [Retention and direction statistics](#retention-and-direction-statistics) | idea | Not set |
| [Review direction and Diario cloze](#review-direction-and-diario-cloze) | idea | Not set |
| [Richer Diario and page possibilities](#richer-diario-and-page-possibilities) | idea | Not set |
| [Source templates and reading follow-ups](#source-templates-and-reading-follow-ups) | idea | Not set |

### Deferred

| Idea | Status | Owner interest |
|---|---|---|
| [Accent bar for typed inputs](#accent-bar-for-typed-inputs) | idea — owner-deferred | Not set |

### Implemented (history)

These rows identify completed work, not deployment status. Open follow-ups remain above.

| Idea | Status | Historical context |
|---|---|---|
| Non-verb grammar drills | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#non-verb-grammar-drills) |
| Suppressed-containment confirmation | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#suppressed-containment-confirmation) |
| Unused dictionary fields (shipped-lemma census) | done | [Record](history/phases/PHASE-24-REPORT.md) |
| The word's biography | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#the-words-biography) |
| Neighborhood browsing | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#neighborhood-browsing) |
| Phrase↔word containment links | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#phraseword-containment-links) |
| Same-meaning clustering | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#same-meaning-clustering) |
| "Conjugates like" verb families | done | [Record](history/phases/PHASE-21-REPORT.md) |
| Android share target | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#android-share-target) |
| English→Spanish lookup | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#englishspanish-lookup) |
| Global tag management | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#global-tag-management) |
| Markdown blank-line spacing | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#markdown-blank-line-spacing) |
| Explicit Notes callouts | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#explicit-notes-callouts) |
| Structured Notes outlines | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#structured-notes-outlines) |
| Grammar guide depth and callouts | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#grammar-guide-depth-and-callouts) |
| Owner-centric stats | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#owner-centric-stats) |
| Learning depth (cloze, reverse, drill, audio) | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#learning-depth-cloze-reverse-drill-audio) |
| Typed or explained relationships | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#typed-or-explained-relationships) |
| Persistent page profiles | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#persistent-page-profiles) |
| Source-oriented page templates | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#source-oriented-page-templates) |
| Meaning-block presentation | done | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#meaning-block-presentation) |
| Diario skill-practice prompting suite | done — Taller v1 | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#diario-skill-practice-prompting-suite) |
| Historia word families | done — 25a; 25b rejected | [Record](history/IMPROVEMENT-IDEAS-HISTORY.md#historia-word-families) |

Reference material: [candidate data sources](research/CANDIDATE-DATA-SOURCES.md),
[Phase 19/20 polish observations](reviews/2026-08-10/PHASE-19-20-NITS.md), and
[document history](history/IMPROVEMENT-IDEAS-HISTORY.md#document-history).

## Active ideas

### Separate classroom-diario space

- **Date added:** 2026-08-20
- **Last reviewed:** 2026-08-20 — the Taller workshop chose **one Diario, two doors** for v1 and
  deliberately avoided foreclosing a later gathering of practice surfaces under Taller. This
  entry stays captured as a contingent future split; experimentation is allowed under owner response §15.
- **Status:** idea
- **Size (draft):** medium for a presentation-only hub; large for stored identity
- **Touches (draft):** screen/navigation; schema and backup only for a stored-kind option
- **Origin:** Same 2026-08-20 owner direction as the prompting suite
- **Owner interest:** Raised by the owner as a possibility, explicitly contingent on what gets
  built: "depending on what gets added, maybe there might even be a need for separate spaces."
- **Potential data impact:** Potentially large. A separate space could stay purely presentational
  (a filter or second hub over the same dated pages) or could want a stored distinction between
  reflective and skill entries — the latter touches §7's two-content-types rule and page
  identity, so it must not be assumed.

#### Description and current context

If the classroom direction grows (skill prompts, scaffolds, tracked practice), skill-drill
entries and reflective moments may sit awkwardly in one timeline. The idea is a second hub —
the current Diario for reflection, a classroom space for structured writing practice — in the
spirit of the existing hub pattern (Pages hub, Words & phrases hub, Cuidar). The cheap version
derives the split (e.g. entries identifiable through existing Taller practice events,
or simply a separate entry point that filters nothing); the expensive version stores entry kind,
which is a §7 discussion. Mixed-use observations can inform the design; they are not a prerequisite
for trying a separate presentation.

### In-app AI prompt drafting

- **Date added:** 2026-08-20
- **Status:** idea
- **Size (draft):** large
- **Touches (draft):** AI request/disclosure, prompt editor; storage/backup if saved
- **Origin:** Owner reflection during the Taller interests discussion, 2026-08-20: "I think that
  llms should be a good prompt writing resource and that my guidance can help direct it."
- **Owner interest:** Wants AI-written, owner-directed prompts, but chose the session-workshop
  model first and asked that runtime generation be captured for later.
- **Potential data impact:** Governed by §9/Phase 6 policy (owner key, disclosure before send,
  spend cap) if built; generated prompts would also need a storage home — see Personal prompt
  store below.

#### Description and current context

Someday Taller could draft a fresh personalized prompt on demand — interests × skill × recent
notebook activity. The owner chose the ad hoc **prompt workshop practice** (owner directs an
LLM in a session, curated results ship as ordinary `journalPrompts.js` data — exactly how the
2026-08-19 skill categories were made) as the starting approach. Runtime drafting remains available
for a separately approved experiment.
The earlier capture note stands: runtime generation trades away an auditable, offline, free
library for added variety, with spend, privacy and provenance costs to weigh against workshop curation.

### Personal prompt store

- **Date added:** 2026-08-20
- **Status:** idea
- **Size (draft):** large
- **Touches (draft):** new personal prompt storage, editor and backup; schema decision
- **Origin:** Privacy question raised while placing workshopped interest-prompts, 2026-08-20
- **Owner interest:** "I don't expect that the prompts will contain much personal information.
  Maybe start with shipped and then add a store later if necessary."
- **Potential data impact:** A new personal-data home for owner prompts (with backup coverage) —
  a real §5 discussion if opened, and adjacent to §7's two-content-types rule, so a design must
  say what a stored prompt *is* (likely a preference-shaped record, not a third content type).

#### Description and current context

Workshopped prompts ship in the public repo's static library, which is fine while they name broad
interests. If prompts ever name the owner's actual life (people, pets, places), they belong in a
private in-app store — editable, backed up, mixed into the same Taller/prompt-library surfaces as
shipped prompts. Also the natural home for any future in-app AI-drafted prompts, and a small-form
revival of the long-deferred "user-authored templates" idea.

### Diario follow-up AI requests

- **Date added:** 2026-08-14
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** AI request/disclosure and review UI; existing Apuntes if chosen
- **Origin:** Owner question during the Apuntes (schema v9) discussion, 2026-08-14
- **Owner interest:** Unsure — "not sure if that's a better option than just going to Gemini for
  additional feedback and bringing that feedback back."
- **Potential data impact:** None decided; a follow-up answer's natural storage home is the
  Apuntes field, so no new schema should be assumed.

#### Description and current context

A second in-app AI call on a Diario entry beyond the one workshopped review: either a small set
of canned follow-up prompts ("explain this in more depth", "give alternative phrasings") or a
free-typed prompt box. Raised while designing the Apuntes box; the current alternative is the
owner's existing round-trip to another tool (Gemini) with the result pasted into Apuntes.

#### Considerations recorded at capture

- The external round-trip has a virtue an in-app button cannot replicate: a genuinely different
  model's second opinion. The Apuntes box removes most of the round-trip's friction, so judge
  the remaining annoyance as useful context, without making a period of use a prerequisite.
- The existing review works because it is constrained — one workshopped prompt, schema-enforced
  JSON, one storage slot with a replace/remove lifecycle and staleness hash. Free-form output
  would need an equivalent home and lifecycle; without one it lands back in Apuntes anyway.
- A free prompt box broadens scope toward a chat client. One or two canned follow-up actions
  would be a smaller experiment; their dated answers could file into Apuntes. Either option
  needs a clear lifecycle. §9's disclosure-before-send posture governs any variant.

### Edge-kind visual vocabulary

- **Date added:** 2026-08-13
- **Status:** idea
- **Size (draft):** small
- **Touches (draft):** screen styling and tokens
- **Origin:** Connection-visualization brainstorm with the owner, 2026-08-13; captured as a
  six-entry batch (see [document history](history/IMPROVEMENT-IDEAS-HISTORY.md#document-history)),
no settled aim yet
- **Owner interest:** Requested for the list while brainstorming.
- **Potential data impact:** None; presentation only, every colour through existing theme tokens

#### Description and current context

The notebook now derives several distinct kinds of connective knowledge — typed Connections,
phrase/word containment, Phase 21 family siblings, prose occurrences, Diario presence — but every
surface that shows them (Detail, Historia, the wander card) distinguishes the kinds only by
section headings over identical-looking rows. A consistent per-edge-kind visual treatment (icon
and/or colour token, used identically everywhere an edge renders) would let the owner read a
relationship's kind at a glance and would teach the type system itself through repetition.

This is also the foundation the other visualization captures from the same batch would reuse:
settling the vocabulary first keeps a later constellation, cluster view, or map consistent with
the lists instead of inventing a second language.

#### Expected owner value

- Every existing connection surface becomes faster to scan, with no new screen to learn.
- The edge kinds stop being implicit section trivia and become something the owner recognizes.

#### Risks and tradeoffs

- Five-plus kinds is at the edge of what colour alone can carry at 375px; icons or labels plus
  colour may beat pure colour coding. Side-by-side variants decide, not argument.
- Mostly a purely-visual change under the lighter loop, but markup restructuring that component
  tests can see crosses back into plan-first territory — the agent-guide line applies: when
  unsure, it is structural.

#### Evidence and design notes

- None beyond the variant pass itself, built with real worst-case content (longest terms, an
  entry carrying every edge kind at once).

---

### Wander constellation (one-hop map)

- **Date added:** 2026-08-13
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** screen/SVG layout and navigation
- **Origin:** Connection-visualization brainstorm with the owner, 2026-08-13; captured as a
  six-entry batch (see [document history](history/IMPROVEMENT-IDEAS-HISTORY.md#document-history))
- **Owner interest:** Requested for the list while brainstorming.
- **Potential data impact:** None; renders exactly the neighborhood data the wander card already
  derives, stores no layout or position

#### Description and current context

Phase 23 excluded a **global** graph visualization; it said nothing against a bounded one. The
wander card already derives an ego-neighborhood — one center plus neighbors grouped by edge kind
— and currently renders it as grouped rows. Drawing the same data as a small SVG (center term in
the middle, neighbors arrayed around it, edge kind carried by the settled visual vocabulary, tap
to hop) would turn wandering from scanning a list into moving through a space, closer to the
accidental-re-encounter feeling 23b was built for. All Phase 23 rules carry over unchanged:
derived at render, event-free, no stored trail, Diario stays an inert count.

#### Expected owner value

- Hops gain a sense of place and direction; the trail Back already walks becomes something the
  owner can picture.

#### Risks and tradeoffs

- Long Spanish terms and phrases on a 375px canvas are the hard problem; a constellation that
  truncates *me da igual* to fit may read worse than the two list rows it replaced.
- Layout must be deterministic enough at render to not jiggle between hops, without persisting
  positions — persistence would be new stored state and a separate decision.
- Accessibility: rows are inherently readable and tappable at 44px; an SVG must earn the same.

#### Evidence and design notes

- The shape of real neighborhoods. Sparse two-neighbor constellations may dominate and look
  emptier than rows. Representative fixtures can explore this; Graph texture is another optional
source of evidence.

---

### Connection cluster browsing

- **Date added:** 2026-08-13
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** derived graph helper and browsing screen
- **Origin:** Connection-visualization brainstorm with the owner, 2026-08-13; captured as a
  six-entry batch (see [document history](history/IMPROVEMENT-IDEAS-HISTORY.md#document-history))
- **Owner interest:** Requested for the list while brainstorming.
- **Potential data impact:** None; connected components derived at render, nothing stored

#### Description and current context

The confirmed typed-connection graph has connected components: a similar-meaning cluster around
one feeling, a linked family neighborhood, and a long tail of items with no connections at all.
Every current surface shows one item's edges; nothing shows a **group as an object**. A derived
view listing the notebook's clusters — and, gently, its isolates — would be the first surface
where the owner experiences the graph they have built rather than one keyhole of it. Isolates
double as a quiet consolidation prompt (an unconnected word is an invitation), with 22b's
proposals as the natural supply line for acting on it.

**Overlap to resolve with Tag hubs and Saved views (below):** all three aggregate items into
browsable groups from different dimensions (graph edges, tags, lens combinations). Whichever is
planned first should consciously answer whether it subsumes the others or they coexist as
parallel dimensions.

**Phase 26 boundary — 2026-08-13:** this entry is the cluster/graph step in the owner's seven-step
connection roadmap; it is not duplicated under a new name. Confirmed stored-once typed links remain
graph authority. Phase 26's Mentioned here proposals never become edges, and its factual
Seen-together evidence may appear in a future visualization only as a separately labeled edge kind
rather than being folded into confirmed clusters or their statistics. The existing sequence still
is a suggested sequence: Graph texture, bounded cluster/constellation views, then the global map.
Section 15 makes it optional rather than an evidence gate.

#### Expected owner value

- "What does my notebook know as a whole?" gets its first honest answer — groups, sizes, and the
  frontier of unconnected words.

#### Risks and tradeoffs

- The no-pressure temperament governs the isolate list: it must read as an invitation, never a
  to-do count. Framing and placement matter as much as derivation.
- With few confirmed edges the view is mostly isolates; shipping it too early would show a
  desert and teach the owner to ignore the surface.
- Cluster membership shifts as links change; the view derives at render and claims no history.

#### Evidence and design notes

- Cluster counts and size distributions help assess usefulness. Sparse and dense fixtures can
support experiments; owner data requires task-scoped permission.

---

### Graph texture in Estadísticas

- **Date added:** 2026-08-13
- **Status:** idea
- **Size (draft):** small
- **Touches (draft):** derived statistics and screen
- **Origin:** Connection-visualization brainstorm with the owner, 2026-08-13; captured as a
  six-entry batch (see [document history](history/IMPROVEMENT-IDEAS-HISTORY.md#document-history))
- **Owner interest:** Requested for the list while brainstorming.
- **Potential data impact:** None; derived counts over existing links, stored nowhere

#### Description and current context

A small connectivity section inside Estadísticas: how many items carry at least one connection,
counts per edge kind, the largest cluster's size, and the number of isolates. Sought out rather
than pushed — the same temperament rule the Review forecast entry records. Beyond its own value,
this can inform the other visualization ideas: it describes neighborhood richness and cluster sizes.
Those experiments need not wait for this screen.

#### Expected owner value

- Answers "how connected is what I know?" at a glance, in the place the owner already visits for
  self-knowledge.

#### Risks and tradeoffs

- Numbers can pressure exactly like forecasts can; keeping them descriptive (texture, not
  targets) preserves the no-pressure temperament.
- Component derivation over all links is cheap at personal scale but should reuse the existing
  derived-graph helpers rather than growing a second traversal.

#### Evidence and design notes

- No prerequisite; its descriptive counts could inform sibling ideas.

---

### Moment-of-learning micro-visuals

- **Date added:** 2026-08-13
- **Status:** idea
- **Size (draft):** small per surface
- **Touches (draft):** screen styling/layout
- **Origin:** Connection-visualization brainstorm with the owner, 2026-08-13; captured as a
  six-entry batch (see [document history](history/IMPROVEMENT-IDEAS-HISTORY.md#document-history))
- **Owner interest:** Requested for the list while brainstorming.
- **Potential data impact:** None; presentation over data the surfaces already derive

#### Description and current context

Rather than a new screen, small visuals placed where connection knowledge is already being
actively used: the Similar-meaning recall reveal could show the confirmed mini-cluster being
recalled as a compact glyph; Historia's milestone list could carry a small timeline strip above
its rows. The bet is that visualization helps memory most when attached to a retrieval or
reading moment the owner is already in, not when it lives on a destination page they must visit.

#### Expected owner value

- The connection work becomes visible precisely when it is being exercised, reinforcing the
  group structure at the moment of recall.

#### Risks and tradeoffs

- Additive clutter is the failure mode: recall reveal and Historia are deliberately calm
  surfaces, and each glyph must justify its pixels at 375px.
- Each micro-visual is its own subjective choice — separate variant passes, separate visual
  commits, per the visual-changes process rules.

#### Evidence and design notes

- Which moments benefit from visuals can be explored in variants or real use; start with one surface
to keep the experiment bounded.

---

### Global graph visualization

- **Date added:** 2026-08-13
- **Status:** idea
- **Size (draft):** large
- **Touches (draft):** graph layout, phone navigation and accessibility; persistence only if separately chosen
- **Origin:** Connection-visualization brainstorm with the owner, 2026-08-13; captured as a
  six-entry batch (see [document history](history/IMPROVEMENT-IDEAS-HISTORY.md#document-history)).
Phase 23 excluded this by name; this entry gives that
  exclusion a place to point rather than reversing it
- **Owner interest:** Requested for the list while brainstorming; explicitly last in the batch's
  suggested order.
- **Potential data impact:** None as scoped (derived, read-only); any stored layout, zoom state,
  or pinned positions would be new personal state and a separate decision

#### Description and current context

The whole notebook as one navigable map. Deliberately held last: it is the hardest visualization
to keep legible on a phone, the most expensive to build, and the one whose learning value is
least proven — the classic risk is a screenshot feature that is admired once and never opened
again. Smaller constellation and cluster experiments could supply reusable machinery and design
lessons. Their prior use is not a condition for trying the global view.

#### Expected owner value

- Seeing the entire personal knowledge graph at once — the one perspective no bounded view can
  give.

#### Risks and tradeoffs

- 375px legibility at hundreds of nodes has no obvious good answer; pan/zoom interaction depth
  is a big cost for a single-owner app.
- Force layouts jiggle and re-arrange between visits unless positions persist, and persistence
  is exactly the stored state this idea must not smuggle in.
- The no-pressure and no-analytics temperament forbids the map from becoming a score.

#### Evidence and design notes

- Smaller visual experiments and representative graph fixtures can inform legibility and navigation.
Usage observations are optional; no usage review is required.

---

### Evidence-backed synonym/antonym proposals

- **Date added:** 2026-08-13
- **Status:** idea
- **Size (draft):** large
- **Touches (draft):** reference-quality audit, matching and proposal UI; existing link writes
- **Origin:** Owner connection-derivation discussion; retained as step 4 after Phase 26 planning
- **Owner interest:** Asked to retain for later, not approved for implementation.
- **Potential data impact:** None for transient proposals; explicit acceptance uses ordinary
  stored-once links. Dismissal memory would be new backed-up preference state.

#### Description and current context

Phase 22 already proposes Similar meaning from conservative overlap in the owner's own glosses.
Phase 24 added sense- and entry-level r4 synonym/antonym strings that could supply a different,
dictionary-backed kind of evidence: synonym could propose **Similar meaning**, and antonym could
propose **Contrast**. The proposal must show the exact dictionary relation plus both personal
meanings, then wait for explicit confirmation.

R4 relation targets are plain strings, not stable dictionary IDs or sense references. A future
quality gate must therefore require unique resolved personal attachments and compatible
part-of-speech/sense evidence; an exact spelling alone is not authority. Phase 25's rejected
`relatedWords` field is never an input — its lost provenance, target identity and false pairs are
already a closed quality verdict.

#### Risks and tradeoffs

- Homographs and multi-entry lemmas can make a true-looking string identify the wrong target.
- Dictionary synonymy is sense-specific; unioning all senses would revive the bank-style trap
  Phase 22 deliberately avoided.
- Proposals remain explained and visit-local. Nothing links automatically, and no transitive
  synonym cluster becomes truth.

#### Evidence and design notes

- A shipped-r4 audit of unique target resolution and sense/POS compatibility over saved-attached
  fixtures before any UI work.
- Real comparison against Phase 22 proposals: whether the dictionary adds useful pairs rather than
  duplicate noise.

---

### Evidence-backed Page-to-Page proposals

- **Date added:** 2026-08-13
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** derived matching, proposal UI and existing link writes
- **Origin:** Owner connection-derivation discussion; retained as step 5 after Phase 26 planning
- **Owner interest:** Asked to retain for later, not approved for implementation.
- **Potential data impact:** None for transient proposals; confirmation uses existing ordinary
  Page links and relationship annotations.

#### Description and current context

Suggest a small number of currently unconnected Pages only when strong, disclosed evidence says
why they belong together: several shared active contextual vocabulary items, or an exact URL shared
through Phase 26's source index. Broad shared tags and mere same-role membership are insufficient.
The proposal shows the shared evidence and asks the owner to choose the ordinary relationship;
it never stores a similarity score or link automatically.

An external Grammar `sourceCaptureRef` is not proposal evidence: the current validator already
requires an outgoing Page connection to that Source page, so such a pair is already connected.
This idea should reuse the active-structure gates and stored-once link writer instead of inventing
a parallel Page graph.

#### Risks and tradeoffs

- Generic vocabulary can make unrelated Pages look similar; minimum evidence and visible terms are
  more important than a clever score.
- Suggested relationship type is a semantic judgement. V1 should ask rather than silently choose
  Related, Found in or Explained by.
- Proposal caps and no dismissal memory keep the first slice schema-free but allow repeat noise.

#### Evidence and design notes

- Check sparse and dense cases: how many Page pairs share meaningful contextual items or an exact
URL, and whether they are already linked. Real-use observations can supplement fixtures.

---

### Optional AI connection review

- **Date added:** 2026-08-13
- **Status:** idea
- **Size (draft):** large
- **Touches (draft):** AI disclosure/request, proposals and link confirmation; provenance if AI notes saved
- **Origin:** Owner connection-derivation discussion; retained as step 7 after Phase 26 planning
- **Owner interest:** Asked to retain for later and keep optional.
- **Potential data impact:** Session-only proposals need none; accepted links use existing storage.
  Cached proposals, dismissals, or AI-authored notes would require separate durability/provenance
  decisions.

#### Description and current context

A user-started review of one current item could deliberately send selected notebook evidence to the
existing Phase 6 provider and ask for possible targets and relationship types. The pre-send screen
must state exactly which entries, meanings, prose or connection summaries leave the device. The AI
returns explained proposals only; no background scan, automatic link, score, queue or silent send.

The first safe slice proposes target and type, then leaves any relationship note owner-authored.
Saving AI-written prose as the shared note would cross the open Personal-content provenance
decision and must not arrive by accident. Every accepted target still goes through the existing
stored-once writer and explicit approval pattern.

#### Risks and tradeoffs

- Model confidence is not evidence; every row must cite the notebook material that motivated it.
- Cost, privacy and provider behavior make this a deliberately summoned tool, not ambient polish.
- Durable rejection memory or cached model output would enlarge the personal backup contract.

#### Evidence and design notes

- Compare the proposed experience with local derivations to understand the privacy, cost and
discovery tradeoff; a real-use waiting period is not required.
- A provenance decision before any AI-authored relationship note can become owner content.

---

### AI Ask and Tidy with a shared review

- **Date added:** 2026-10-24
- **Status:** in progress — Ask + Keep (first slice) published 2026-10-24 (`29101fe`) and awaiting owner checks; "Ask about this" attachments (follow-on step 1, below) complete locally, not yet published; Tidy remains an idea
- **Size (draft):** large overall. Ask with Keep is medium to large; Tidy is large; the shared
  review is part of whichever is built first
- **Touches (draft):** AI request/disclosure (existing Phase 6 layer), a new proposal format and
  review/apply screen, existing writers (item create, meanings, stored-once links, Phase 20 tag
  operations, page create); a last-tidy preference
- **Origin:** Owner brainstorm with Claude Code, 2026-10-24
- **Owner interest:** Discussion only; no build decision. The owner agreed with the two-feature
  shape, the Ask-first order and the leads approach below.
- **Potential data impact:** Create-only proposals use existing storage. A proposals-file import
  is a new input path that needs its own design. No inbox store and no chat-history store are proposed.

#### The problem (owner's words, summarised)

- Questions such as "how do you say this phrase?", "another way to say this sentence?",
  "a Spanish equivalent of this English idiom?" and "explain what I just heard" come up
  often. The bundled dictionary answers single words but not phrases or rewordings.
- Asking Gemini works, but after a few turns the owner must decide what is worth keeping,
  extract only that text and format it as a note. "While possible, most of the time I'm not going
  to do that." Sharing the whole conversation into the app brings too much text and still needs
  formatting. A fixed-format outside project or an inbox of outputs still leaves the job of
  turning them into organised notes.
- Separately, the owner would like an LLM to look across the notebook and suggest
  connections, evaluate tag use, suggest topic pages from saved words and phrases, and similar.

The barrier is turning answers into organised notes, not getting an answer. The useful
AI job is that turning step.

#### Shape: two features over one shared core

| | Ask | Tidy |
|---|---|---|
| When | Frequent, in the moment, on the phone | Occasional, deliberate |
| Scope | One conversation | Much or all of the notebook |
| Proposes | Mostly new entries | Mostly changes to existing ones |
| Needs | Speed | Depth and back-and-forth |

**Ask.** The owner types a question, follows up a few times, then taps **Keep**. The AI reads the
whole thread and proposes notebook-ready entries. Starting fresh for each question was preferred
over one endless session: the questions are mostly unrelated, a long history adds cost and noise,
and the notebook itself serves as memory. A small standing profile (level, dialect preference)
gives continuity without stored history. Keep should also accept a **pasted or shared outside
conversation**, such as Gemini, so the owner keeps a second model's view without extracting
text by hand.

**Tidy.** A deliberate pass that proposes connections between differently worded items with
related meanings, a cleaner tag scheme and topic pages that group saved phrases. Plain counting
work, such as tag usage and single-use tags, needs no AI. Existing local proposals already
cover containment and some Similar-meaning matches.

**Shared core, built once:**

1. **A proposal format**: create an item, add a meaning or example, link two items with an
   existing relationship type (Similar meaning, Variant, Contrast, Often confused…), add or
   merge a tag, create a page or add to one. This is the expensive-to-redo decision; design it
   for both features from the start.
2. **One review screen**: a tick per proposal, then Apply through the existing writers. Apply
   refuses a change to anything edited since the AI saw it. Nothing saves without the owner's tap.
3. **The existing request layer**: owner key, disclosure before send, cost.
4. **Local matching**: "you already have this" and link targets are found on the device, so
   the notebook need not be sent for Ask.

Ask and Tidy meet in the middle. Keep's best proposals often include small organising steps
for the new item, such as a link to an existing phrase or the tag used on similar items.

#### How proposals can reach the review screen

| Route | Description | Notes |
|---|---|---|
| In-app | Browser calls Claude with the owner's key, as the Diario review does | Required for Ask; also usable for Tidy |
| File round trip | Export → Claude (claude.ai or Claude Code on the XPS) analyses the export and writes a proposals file → the app opens it in the review screen | Good for deep, conversational Tidy sessions on the subscription; a new import path, distinct from replace-only backup restore |
| XPS sync | The notebook lives on the XPS too; Claude Code proposes at any time | Model: notes_app Phase 4. Current scope excludes server and sync; only worthwhile for ongoing background work |

Because Ask needs the in-app route anyway, start there. The file round trip is an optional later
extra; sync is not needed for anything discussed here.

#### Leads for Tidy (decided against a separate inbox)

A running list of "things to tidy" was considered. The agent's judgement, which the owner
accepted, is that a dedicated inbox is unnecessary at first:

- **New, unorganised items** are derivable: Tidy defaults to items created or edited since the
  last tidy (from events, plus a small last-tidy preference).
- **Organising Ask notices in the moment** belongs in Keep's review right then, not deferred.
- **Owner hunches** use an existing tag (e.g. `revisar`) or a Notes page, which Tidy reads as
  leads. No new store is needed.
- A real inbox would add a store, a backup and a lifecycle, risks an unread backlog, and
  stored AI leads go stale.

Revisit only if Ask repeatedly raises things that cannot be decided in the moment and a tag
proves too thin because reasons need to travel with the lead.

#### Suggested order (agent estimate)

1. Design the shared proposal format for both features.
2. **Ask + Keep** with create-only proposals (the safest kind) plus small link/tag
   suggestions; pasted-conversation input.
3. **Tidy** adds the harder kinds of change: edits to existing items, tag merges and page
   creation, all using the staleness checks.
4. Optional: the proposals-file round trip for deep sessions. XPS sync only if background
   work becomes wanted.

Separate entry points: Ask somewhere quick to reach; Tidy alongside notebook views or settings.

#### Follow-on: "Ask about this" (owner request after first use, 2026-10-24)

Most questions start from something on screen, so a tap should attach it to the next Pregunta
question instead of the owner retyping it. Agreed order:

1. **Attachments (OWNER-APPROVED, complete locally 2026-10-24, not yet published).** A list of attached entries (up to 5), sent as
   text snapshots while the app keeps which entry each came from. Buttons on the entry screen
   (words, phrases, pages) and on a revealed Repaso card: "Ask later" queues the card without
   leaving the session, "Ask now" ends the session first (owner chose both). One-tap starter
   questions, linked entry names included, and Keep treats attached entries as link targets.
2. **"Add to an existing entry" proposals** for Keep — the same capability Tidy needs, built once.
3. **Several entries or a collection as context**, which by then overlaps with Tidy.

#### Risks, dependencies and related ideas

- [Personal-content provenance](#personal-content-provenance): whether AI-written meanings or
  notes are marked as such is unresolved and affects Keep directly.
- Tag merges have no undo ([Tag maintenance follow-ups](#tag-maintenance-follow-ups)); a
  pre-change export remains the safety net for Tidy tag proposals.
- Ask costs money per question on the owner's key. notes_app measured roughly 2–6¢ per
  question or tidy on Opus 5.5, but that was a different app and prompt.
- AI suggestions for idiom equivalents can be confidently wrong; context corpora (Reverso
  Context) or native-speaker forums remain useful checks.
- Related: [Optional AI connection review](#optional-ai-connection-review) is a one-item slice
  of Tidy; [Diario follow-up AI requests](#diario-follow-up-ai-requests) records the owner's
  earlier Gemini round-trip hesitation, which this idea responds to.
- Reference implementation: notes_app (`~/code/notes_app`), Phase 3 (in-browser ask and tidy,
  tick review, all-or-nothing Apply, Undo) and Phase 4 (XPS sync with owner-approved proposals).

---

### Conjugation catalog extensions

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** classifier/reference coverage, dictionary pipeline and teaching UI
- **Origin:** Phase 21 post-implementation corpus review
- **Owner interest:** Recorded so the measured observation is not lost; not approved for implementation
- **Potential data impact:** None to personal data; classifier/report changes would require a new
  replaceable dictionary package if later approved

The 28 paradigms still outside Phase 21's bounded catalog include two candidate groups worth a
future required-cell sweep: c→z before o/a behavior among verbs such as *vencer, convencer,
ejercer,* and *torcer*; and i-absorbing behavior among -ñir/-llir verbs such as *teñir, reñir,
ceñir,* and *gruñir*. These are evidence-backed candidates, not accepted families: duplicate
lemma consistency, contrast selection, overlap behavior, member counts, and top-frequency value
must be measured before changing the catalog.

---

### Monolingual recall (Spanish usage cues)

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** card selection/rendering; cue availability
- **Origin:** Consolidation-themed brainstorm, requested for the list by the owner 2026-08-12
- **Owner interest:** Requested with the rest of the consolidation batch; assessed as the
  deepest learning payoff of the five.
- **Potential data impact:** None expected; a card mode over existing structured-meaning data,
  following the established face/mode precedents

#### Description and current context

Structured meanings already store an optional short **Spanish usage cue**. A card mode asking
term → Spanish cue (or cue → term), skipping English entirely, is the first step toward thinking
in Spanish rather than through translation — the textbook definition of consolidation. Entries
without cues are excluded and explained, the pattern every card surface already uses. A welcome
side effect: it creates a reason to write cues, which are optional today and likely sparse.

#### Risks and tradeoffs

- Cue-recall is self-graded almost by necessity (a cue is free text; exact matching would grade
  phrasing, not understanding) — the reveal/self-grade machinery already exists.
- If cues are sparse, the mode starves; the coverage check below comes first.
- Whether this is a free-practice mode only or may join scheduled review needs the same
  face/grading-fairness discussion recorded under Dictation cards.

#### Evidence and design notes

- How many real meanings carry a usage cue — a disposable count over a backup export. Sparse
  cues make this a "write cues first" story, which may itself be the feature's first increment
  (a completeness view for missing cues).

---

### Retired-word spot checks

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** review selection and UI; event/scheduling decision if grades affect retirement
- **Origin:** Consolidation-themed brainstorm, requested for the list by the owner 2026-08-12
- **Owner interest:** Requested with the rest of the consolidation batch.
- **Potential data impact:** None for a history-free version; a demoting version writes ordinary
  review events and needs its own approved decision

#### Description and current context

Retired words can re-enroll through the ordinary tricky/lookup rules, but there is no deliberate
retired-word spot-check cycle to reveal forgotten material.
An **owner-started** "spot-check retired words" deck — a handful, sampled oldest-retirement-first
— keeps consolidated knowledge verifiably consolidated. Owner-started with no automatic
re-enrollment keeps it on the right side of §14's scheduling deferral.

#### The one real product decision

What a failed spot check *does* is the whole design: a history-free version (like hub practice)
merely informs the owner, while a demoting version writes a review event that puts the word back
on the Leitner ladder. Demotion is honest but turns a casual check into something with stakes;
history-free is gentle but leaves the decay it found unfixed. This mirrors, in miniature, the
Phase 13 decision that reversed the ungraded drill — worth deciding deliberately, not
defaulting.

#### Evidence and design notes

- Enough Retired words for sampling to mean anything, and the owner's own sense of whether
  retired words are actually slipping.

---

### Near-duplicate consolidation view

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** derived matching and maintenance screen; existing actions
- **Origin:** Consolidation-themed brainstorm, requested for the list by the owner 2026-08-12
- **Owner interest:** Requested with the rest of the consolidation batch.
- **Potential data impact:** None; a derived maintenance view offering only existing tools.
  The limited personal-twin merge already exists; broader merging remains a separate decision

#### Description and current context

Phase 5f's duplicate guardrails act at creation time; nothing finds near-duplicates that
accumulated before them or slipped past — the same normalized term saved twice, or two entries
with heavily overlapping glosses. A derived maintenance view surfacing candidate pairs, offering
the existing tools (link them as `Variant`/`Similar meaning`, or edit one away by hand), fits
the completeness-view pattern the hub already has.

**Boundary:** the limited personal-twin merge shipped on 2026-08-13. Broader automatic or assisted
merging remains outside this view. Merging two
lexical entries means reconciling meanings, examples, links, Collection memberships and event
history — the same class of stored-inverse-data problem that kept persistent undo out of
Phase 20 (see [Tag maintenance follow-ups](#tag-maintenance-follow-ups)). The view is the safe first
step; merging
beyond the existing twin operation would be its own proposal.

#### Evidence and design notes

- Representative duplicate pairs can support an initial experiment. An owner-approved, read-only
snapshot review could later establish how often those cases occur.

---

### Dictionary word-family explorer

- **Date added:** 2026-08-12
- **Last reviewed:** 2026-08-13 — Phase 25's shipped-package audit answered the quality question
  negatively: r4's flattened strings cannot support either the explorer or its personal-layer
  shadow without a reference-data redesign preserving relation provenance and target identity
- **Status:** idea
- **Size (draft):** large
- **Touches (draft):** reference-data redesign/quality audit, identity mapping and browsing UI
- **Origin:** Owner suggestion, assessed and requested for the list 2026-08-12
- **Owner interest:** Requested after review of the assessment, including the verified data facts
  below.
- **Potential data impact:** None to personal data; a new dataset version of the replaceable
  dictionary package (`mi-cuaderno-ref-a`/`-b`), with the §5 alias/orphan rules carrying the
  rebuild as usual

#### Description and current context

From *decidir*, explore related shipped lemmas such as *decisión* and *decisivo*, then open or
save them through existing flows. This is a **derivational**-family feature — words sharing a
root across parts of speech — and a vocabulary *growth* feature: it teaches "you almost know
three more words," and pairs naturally with Frequency coverage's "what next?" question.

The proposed **personal-layer shadow** was the consolidation reading of this growth feature:
grouping the owner's saved words by shared family ("you know 3 words from the *decidir* family").
**Update 2026-08-13:** r4 shipped the source strings, but Phase 25's mandatory audit rejected both
the shadow and explorer as unsafe. The field merged genuine derivations with broad relations and
discarded target-entry identity; reciprocal matching did not repair the false claims. Neither UI
may proceed from r4. Any revival starts with a separately approved reference-data redesign rather
than another string matcher.

**Sibling idea, deliberately separate:** "Conjugates like" verb families, implemented as Phase
21 (history index above), is the **inflectional** counterpart — verbs sharing a paradigm — and a
*consolidation* feature. It derives from shipped paradigm tables, while this idea needs new source
fields; keeping them separate stops this coverage question from inheriting Phase 21's product
semantics merely because both appear at lookup time.

#### Verified data facts — 2026-08-12 to 2026-08-13

Checked against the repository, not assumed:

- The raw Kaikki dump (`pipeline/raw/kaikki-Spanish.jsonl.gz`) carries the needed fields, per the
  spike's structure inspection (`pipeline/spike/out/02-kaikki-structure.json`, 807,155 records):
  `derived` on 6,189 records at word level and 9,183 at sense level; `related` on 5,241 and
  12,341.
- Phase 24's r4 build now merges both fields into dormant, de-duplicated plain lemma strings;
  7,312 shipped entries carry 45,955 relation mentions. It deliberately preserved neither the
  source relationship kind nor the intended target entry id, sense, or part of speech.
- **Phase 25 quality audit:** 8,125 mentions resolve to a normalized shipped lemma (17.68%);
  1,386 of those hits (17.06%) target a lemma represented by multiple entries. Deterministic
  samples exposed broad relations and false entry claims, while a reciprocal filter still kept
  pronoun paradigms, homographs, and sense/POS mismatches. See
[PHASE-25-DIRECTION.md](history/phases/PHASE-25-DIRECTION.md) and
  [PHASE-25-REPORT.md](history/phases/PHASE-25-REPORT.md) for the full verdict.

#### Risks and tradeoffs

- **R4 is not a safe relationship source.** The audit closed the earlier coverage question but
  failed the more important claim-quality gate: most mentions do not resolve, and a resolved
  lemma still does not identify the intended entry or relationship kind.
- A redesigned package must preserve derivational provenance and target-entry identity while
  still treating a genuinely excluded target as "not installed", never "orphaned".
- Family derivation must come from this data, never from string-stem heuristics — spelling
  similarity produces false relatives, and a wrong family member teaches a false connection.

#### Potential timing

R4 already ships the flattened strings, but Phase 25 proved they cannot authorize a display.
Reopen only with a separately approved reference-data redesign that retains derivational source
kind and unambiguous target identity; another UI-side string matcher is not an implementation
path. The explorer itself remains unapproved.

---

### Select text to look up

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** selection handling, search navigation and phone UI
- **Origin:** Owner suggestion, assessed and requested for the list 2026-08-12
- **Owner interest:** Requested after review of the assessment.
- **Potential data impact:** None; read-only navigation glue, no storage, no events beyond what
  the destination screens already log

#### Description and current context

Select a Spanish word or phrase inside a rendered Page or Diario entry and send it directly to
the existing dictionary/notebook search. The machinery mostly exists: two-layer search already
resolves inflected forms to their lemmas, and cross-tab Back navigation already retains the route
and search context that led to an entry, so returning to the paragraph after a lookup is solved
behavior. This is the lightweight sibling of the uncaptured assisted-reading idea — one word at
the moment of curiosity rather than annotating a whole text — and shipping it would generate
evidence for or against building assisted reading later. The Android share target (implemented
2026-08-13) is the same capture instinct pointed at text *outside* the app; this handles text
already inside it.

#### Risks and tradeoffs

- The real design question is phone selection UX: Android's own text-selection toolbar competes
  for the same gesture, so the app needs its own quiet lookup affordance when a selection exists
  inside read-mode text, without fighting the system menu.
- Selection over rendered Markdown must yield clean text (selection APIs largely do this), and
  multi-paragraph or very long selections should degrade to something sensible rather than a
  garbage query.

#### Evidence and design notes

- Try phone-selection interactions with representative text; real use can refine the affordance.

---

### Paste a vocabulary list

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** large
- **Touches (draft):** parser, preview, lexical creation/events and dictionary matching
- **Origin:** Owner suggestion, assessed and requested for the list 2026-08-12; absorbs the
  earlier uncaptured "bulk vocabulary import from a wordlist" brainstorm as its file-based
  variant
- **Owner interest:** Requested after review of the assessment; needs a design discussion before
  any plan.
- **Potential data impact:** New ordinary lexical entries only, created explicitly; no schema,
  backup or event-type change expected

#### Description and current context

Paste several lines copied from a lesson, subtitle list, or notes; preview each line's dictionary
match and duplicate status; then explicitly create only the selected entries as ordinary personal
words and phrases. Today vocabulary enters one entry at a time, which makes a lesson's worth of
words a chore. The project already holds every precedent this needs: the Collection picker's
staged quick-create, Phase 5f's duplicate guardrails, and Phase 12's import sheet — preview rows,
nothing selected by default, explicit confirm — is practically the template.

**Non-goal boundary, stated deliberately:** §13's merge-mode-import non-goal is about merging two
notebook *states* (backup files). This is explicit, previewed creation of new content and sits on
the safe side of that line — but it is near enough that the boundary should be restated in any
approved plan rather than assumed.

#### Potential options

1. **Paste-based (primary).** A textarea accepting one term per line; the simplest and safest
   parse.
2. **Pair parsing.** Split "term — meaning" lines into a prefilled meaning, which is what lesson
   notes actually look like; more useful and more ways to misparse.
3. **File-based variant (the earlier bulk-import brainstorm).** Accept a CSV or an exported list
   from another app through the same preview/confirm core. Same feature, different mouth; only
   worth its extra handling if a real file source exists in the owner's life.

#### Expected owner value

- Turns a lesson, episode, or article's vocabulary into notebook entries in one sitting instead
  of many.
- The preview step doubles as triage: duplicates surface before creation, and dictionary matches
  offer attachment at creation time.

#### Risks and tradeoffs

- **Hollow entries are the real hazard.** A bulk-created entry with no meanings is dead weight —
  card surfaces already exclude and explain meaningless entries. The preview should lean on each
  row's dictionary match to offer Phase 12-style sense import, or the feature manufactures a pile
  of entries the learning surfaces skip.
- **Event honesty.** N creations write N ordinary events into Recent activity and the streak —
  the same deliberate trade-off Phase 20 made for tag batches; its watch-item reasoning applies
  verbatim here.
- Parsing is where scope creeps: separators, duplicate lines within the paste, phrases versus
  words, and leading articles ("la mochila") all need unglamorous decisions.

#### Evidence and design notes

- Where the owner's lists actually come from (lesson notes, subtitles, another app's export),
  which decides between paste-only and the file variant, and whether pair parsing is worth its
  misparse risk.

#### Questions for a future discussion

- Does this live in the Words & phrases hub, the Cuaderno add flow, or both?
- Should a row with a dictionary match default to attaching the entry (`dictKeys[]`), matching how
  the Collection picker treats dictionary selections?
- Is there any appetite for the file-based variant now, or does paste cover the real cases?

---

### PWA app shortcuts

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** small
- **Touches (draft):** manifest shortcuts and arrival routing
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** Recorded so it is not forgotten; the owner may or may not do it.
- **Potential data impact:** None; manifest entries plus explicit arrival routing

#### Description and current context

The web app manifest's `shortcuts` array puts entries like "New Diario moment", "Repaso" and
"Search" on the installed app icon's long-press menu on Android. Each shortcut needs an explicit
arrival route into the chosen screen: current startup handles history state and share parameters,
not arbitrary shortcut URLs. Respect the `/mi-cuaderno/` base path and preserve startup/share
behavior.

#### Expected owner value

Shortens the path to the actions done daily. The Android share target (implemented 2026-08-13)
covers content coming *into* the app; this covers reaching a chosen screen faster.

#### Evidence and design notes

None beyond trying it — the cost is low enough that a real-device check of how Chrome on Android
presents the shortcuts is the whole evaluation.

---

### "Did you mean" search suggestions

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** query suggestions and search UI; normalization unchanged
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** A good potential idea.
- **Potential data impact:** None; a derived suggestion layer over existing search

#### Description and current context

When Cuaderno search returns nothing, offer near matches — a one-letter typo, a transposition, a
missing accent beyond what normalization already forgives. The Cuaderno root already records
misses, so this answers some of them at the moment they happen instead of leaving them in the log.

The critical boundary: `normalize.js` must not change, and suggestions must never widen *matching*.
"año" must never silently match "ano" — but a miss screen may *offer* "did you mean año?" as a
tap-through, because an offer the owner confirms is not a match. The suggestion layer sits
strictly above the search pipeline.

#### Potential options

1. **Personal layer only** — suggest near matches from the owner's own vocabulary, the smallest
   and most personally relevant candidate set.
2. **Both layers** — include dictionary lemmas, which is where a misspelled new word actually
   lives; requires the distance computation to stay fast over 10,278 entries or be indexed.

#### Risks and tradeoffs

- Edit-distance suggestions can surface embarrassing or absurd neighbors; a conservative distance
  threshold matters more than recall.
- The miss log currently records honest misses; if a suggestion is taken, deciding whether the
  original miss still logs affects the meaning of the recorded signal.

#### Evidence and design notes

- The recorded misses themselves: what fraction of real misses are near-misses of known content
  versus genuinely absent words. That decides whether option 1 suffices.

---

### Tag hubs

- **Date added:** 2026-08-12
- **Last reviewed:** 2026-08-13 — Connection cluster browsing (above) joined the overlap question
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** derived retrieval and navigation; preferences if pins chosen
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** An idea to revisit later, when the owner has more tags and uses tags more.
- **Potential data impact:** None; fully derived, no storage

#### Description and current context

Tags currently filter lists. A tag detail view would aggregate everything carrying an exact tag —
words, phrases, pages, and journal entries via the deliberate-search path — making tags a
browsable dimension rather than only a filter. Phase 20's global tag management keeps the tag
vocabulary tidy enough for hubs to stay trustworthy.

**Overlap to resolve with Saved views (below):** a tag hub is close to a persistent single-tag
view. Whichever idea is planned first should consciously answer whether it subsumes the other —
a hub is tag-only but zero-configuration, while a saved view is broader but needs naming and
maintenance. **Since 2026-08-13** Connection cluster browsing (above) is a third member of the
same question: graph edges, tags, and lens combinations are three grouping dimensions, and the
first one planned should decide whether they coexist or converge.

#### Evidence and design notes

- Real tag volume and usage: hubs earn their place when the owner reaches for a tag expecting a
  place, not a filter. The owner has explicitly gated this on their own future tag use — check
  back when tags have grown, not on a date.

#### Questions for a future discussion

- Is a hub a screen of its own or an enriched filter state?
- Do Diario entries appear by default in a tag hub, or only behind the deliberate-search rule?

---

### Review→writing bridge

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** review completion and Diario navigation; transient prompt
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** Worth considering.
- **Potential data impact:** None; a transient prompt, nothing stored

#### Description and current context

After a review session with misses, offer a transient Diario prompt: "write a sentence using
*tozudo*." One line of glue between the app's two halves — the words missed in review are
precisely the ones the owner's writing never exercises, and Diario's prompt machinery is already
transient for ordinary prompts. Taller separately stores practice metadata in events; this bridge
can remain transient unless tracking is explicitly chosen. This also serves the
active-vocabulary theme recorded in the [document
history](history/IMPROVEMENT-IDEAS-HISTORY.md#document-history) on 2026-08-11.

#### Potential options

1. **A post-session action** ("write with these words") that opens a new Diario moment with the
   missed words available as a visible, unstored prompt.
2. **A Diario-side prompt source** — the existing prompt list occasionally offers "use a word you
   missed recently", derived from review events at render.

#### Risks and tradeoffs

- Keep the action optional. Diario supports both reflection and deliberate Spanish practice;
  the owner chooses when a review-to-writing transition is useful.
- Selecting "recent misses" reads the event log at render — cheap and consistent with how
  everything else derives.

#### Evidence and design notes

- Whether the owner actually wants to write immediately after reviewing, or whether the two
  activities happen at different times of day — which decides between options 1 and 2.

---

### Time-boxed mixed session

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** large
- **Touches (draft):** session composition, grading and event semantics
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** Should be on the list.
- **Potential data impact:** None expected; composes existing engines and writes only the events
  each engine already writes

#### Description and current context

"Give me five minutes": one owner-started sitting composing due Repaso cards with the Gym's
current weakest forms, sequenced rather than chosen one surface at a time. All the engines,
grading rules and event contracts exist; this is a front door, not new machinery. It stays on
the right side of §14 because nothing is scheduled, reminded or mandatory — the owner starts it,
exactly like every existing session.

#### Potential options

1. **Time-boxed** — fill roughly N minutes using known per-card pacing, ending at the box even
   mid-queue.
2. **Count-boxed** — "10 cards + 5 forms", simpler and more predictable than minutes.
3. **Due-first composition** — always drain due reviews before Gym content, so the scheduled
   queue never loses priority to practice.

#### Risks and tradeoffs

- Mixing surfaces mixes event contracts; the composition must keep each engine writing exactly
  what it writes today (review events from the scheduled pass, drill events from Gym answers)
  with no new session-level record.
- A "weakest forms" selection reuses Adaptive's existing definition rather than inventing a
  second notion of weakness.

#### Evidence and design notes

- Real data volume: with a small due queue and sparse drill history, a mixed session degenerates
  into whatever exists. The feature makes sense once both queues are routinely nonempty.

---

### Review forecast

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** small
- **Touches (draft):** derived schedule statistics and screen
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** Can be added, but likely a low priority.
- **Potential data impact:** None; derived at render from the existing Leitner schedule

#### Description and current context

"12 due tomorrow, 40 this week" — the due dates already derive from the event log, so a forecast
is a small aggregation over the same computation Repaso runs today, displayed in Estadísticas'
derived-at-render pattern. It is display, not scheduling: no reminder, no badge, no obligation,
which keeps it clear of §14's deferral of automatic scheduling and reminders. It belongs to the
same family as the Phase 11 stats and their still-open retention/coverage/per-direction
breakdowns (see [Retention and direction statistics](#retention-and-direction-statistics)).

#### Expected owner value

- Answers "what is coming?" so a heavy day is visible before it arrives — useful when deciding
  whether to review tonight or tomorrow.

#### Risks and tradeoffs

- Forecast displays can create quiet pressure; keeping it inside Estadísticas (sought out, not
  pushed) preserves the no-pressure temperament.

---

### Confusion-pair drills

- **Date added:** 2026-08-12 (promoted out of the Learning depth entry's "deliberately not built"
  list, where it had been recorded since 2026-08-06 and was invisible to anyone browsing open
  ideas)
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** card selection, pair presentation and grading choice
- **Origin:** Phase 10 planning; dropped from that batch for scope only, and described there as
  attractive
- **Potential data impact:** None expected; the source data already exists as owner-curated
  `often_confused` and `contrast` relationship annotations

#### Description and current context

A drill built from the owner's own `often_confused` and `contrast` connection annotations: the
pairs the owner has personally marked as confusable are exactly the ones worth deliberate
practice. Since Phase 10 dropped it for scope, the machinery has matured — Phase 17's four-choice
recognition engine with curated confusables is close to what this drill needs, with the decks
drawn from personal annotations instead of shipped reference data.

**Sibling:** the shipped Contrasts lane practices *grammar* confusions from curated
reference data; this practices *vocabulary* confusions from the owner's own annotations. They
could share an engine but differ in data source and in what "curation" means.

#### Expected owner value

- Deliberate practice for precisely the confusions the owner has already caught themselves
  making — the highest-signal practice data in the notebook.

#### Risks and tradeoffs

- Needs enough annotated pairs to fill a session; with few pairs, the drill repeats itself
  immediately.
- A pair is two personal items; the drill must handle one side lacking meanings the same way
  existing card surfaces exclude and explain such entries.

#### Evidence and design notes

- How many `often_confused`/`contrast` annotations actually exist in the real notebook — the
  feature starts mattering at perhaps a dozen pairs.

---

### Dictation cards

- **Date added:** 2026-08-11
- **Status:** idea
- **Size (draft):** large
- **Touches (draft):** speech playback, typed grading, card selection and accessibility
- **Origin:** Brainstorming session on unconsidered possibilities; not yet requested from real friction
- **Potential data impact:** None expected; additive `face` metadata on existing review events,
  following the cloze and image precedents

#### Description and current context

The browser's Spanish TTS voice (Phase 10d) speaks the term; the owner types what they heard. This
trains listening and spelling together — including accents, which the Phase 13 exact-first checker
already grades correctly (`hablo` vs `habló`). The card engine now has four question faces (term,
reverse, cloze, image) with an established priority rule and session-start snapshotting; a
dictation face would follow the same pattern. Everything runs on-device; TTS sends nothing
anywhere, and the existing rule that TTS-dependent surfaces hide entirely where the device has no
Spanish voice would govern availability.

#### Potential options

1. **A fifth question face** in the shared card engine, available in scheduled Repaso and free
   practice wherever Type mode is active, with a position in the face-priority order.
2. **A free-practice-only mode** first, keeping the scheduled queue unchanged until the face
   proves itself.
3. **A Gym lane** instead, treating dictation as a drill over a chosen pool rather than a face on
   vocabulary cards.

#### Expected owner value

- Trains the one skill pairing (listening + spelling) no current surface touches.
- Reuses the accent-aware checker, so a missing accent is a named near miss rather than a silent
  pass — the same reason the conjugation drill grades exactly first.

#### Risks and tradeoffs

- TTS quality varies by device; a mispronounced word grades the owner on the voice's error, not
  their listening. A per-card way to fall back to the plain face may be necessary.
- Spanish homophones and near-homophones (b/v, ll/y, silent h) make some words ungradable from
  audio alone; the checker or the card selection must account for words whose spelling cannot be
  recovered from sound.
- Scheduled grades from a new face affect the one Leitner ladder; the cloze/image precedent
  (additive metadata nothing reads) covers this, but the grading-fairness question is real.

#### Evidence and design notes

- Compare face-selection options in a bounded experiment; picture-face experience can inform
  owner controls without being a prerequisite.
- Whether the device's Spanish voice is good enough to grade against — the existing pronunciation
  button provides this evidence passively.

#### Questions for a future discussion

- Where does dictation sit in the face-priority order relative to image and cloze?
- Should homophone-risk words be excluded automatically, accept either spelling, or be graded
  with a named near miss?

---

### Frequency coverage

- **Date added:** 2026-08-11
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** reference-rank join, definition of known and statistics UI
- **Origin:** Brainstorming session on unconsidered possibilities; not yet requested from real friction
- **Potential data impact:** None; derived at render from existing `freqRank` reference data and
  the personal layer, in the Phase 11 pattern

#### Description and current context

The dictionary carries `freqRank`, and no stat uses it. Joining it against the personal layer
yields "you know N of the 1,000 most common Spanish words" — an absolute progress measure that
streaks and the Leitner ladder (which only measure activity and scheduling) cannot give. The same
computation inverted gives a browse view of high-frequency dictionary words not yet in the
notebook, a principled answer to "what should I learn next?" that the miss log cannot provide
(a search miss has no entry and therefore no rank).

**Not the same idea as the rejected "frequency weighting".** Phase 10 planning considered and
rejected weighting dictionary *suggestions* by `freqRank` (see Learning depth in the Implemented
band) — that rejection was about suggestion ranking and does not cover this, which is a display
statistic and a deliberate browse view. Neither re-litigates the other.

#### Potential options

1. **A single Estadísticas tile**: coverage of the top 1,000, perhaps with a small band breakdown
   (top 100 / 500 / 1,000 / 5,000).
2. **Coverage plus a browse view** of unsaved high-frequency words, feeding the existing
   save-from-dictionary flow.
3. **A "known" threshold choice**: saved at all, versus reviewed to some Leitner box, versus
   retired — each tells a different story.

#### Expected owner value

- An honest, motivating absolute measure of progress against the language rather than against
  the owner's own past activity.
- A ranked next-words list grounded in corpus frequency rather than whim.

#### Risks and tradeoffs

- Corpus frequency is not personal relevance; the words the owner needs for their life may rank
  low. The view must inform, not nag — no goal-setting, no pressure mechanics, per the project's
  no-analytics temperament.
- "Known" is genuinely ambiguous (option 3), and the tile is only honest if its definition is
  stated on the surface.
- Multiword phrases have no rank; coverage is a words-only statistic and should say so.

#### Evidence and design notes

- Whether `freqRank` coverage across the 10,278 shipped lemmas is dense enough for stable band
  percentages (what fraction of shipped entries carry a rank at all).

#### Questions for a future discussion

- Which "known" definition matches what the owner wants the number to mean?
- Does the browse view belong in Estadísticas, the dictionary surface, or the Words & phrases hub?

---

### Saved views

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-12
- **Status:** idea
- **Size (draft):** small for fixed presets; large for named/pinned views
- **Touches (draft):** screen presets or new preference/backup contract
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** None for additional built-in presets; persistent preference/backup
  contract for owner-created views

#### Description and current context

Cuaderno offers type, maintenance, tag and order controls. Later navigation-continuity work restores
route state; that is distinct from named persistent views. A saved view would preserve a useful
combination
such as "phrases missing examples," "recently added Mexico vocabulary," or "unlinked source pages."

A saved view is a temporary lens over canonical items, not a new category or a copy of the content.

**Overlap to resolve with Tag hubs (above):** a tag hub is close to a persistent single-tag view.
Whichever idea is planned first should consciously answer whether it subsumes the other.

#### Potential options

1. **Additional built-in presets.** Add a few fixed, broadly useful combinations without saving
   owner configuration.
2. **Remember last-used controls.** Restore the most recent state without introducing named views.
3. **Named saved views.** Save type, maintenance view, tag, order, and possibly search text under an
   owner-chosen name.
4. **Pinned views.** Give selected views a compact shortcut without making them top-level content.
5. **Rule-based collections.** Combine several criteria and possibly relationship or provenance
   rules.

#### Expected owner value

- Turns repeated retrieval and maintenance workflows into one action.
- Lets one item appear in several useful contexts without duplication.
- Makes a larger notebook easier to revisit without remembering filing choices.
- Could support recurring study, enrichment, source, or topic workflows.

#### Risks and tradeoffs

- A miniature query builder could be more complex than the notebook warrants.
- Views can become stale when tags disappear or their spelling changes.
- Restoring an active view can make items appear missing unless the UI clearly shows the filter.
- Saved searches may remain useful for less time than saved structural filters.
- Shortcuts can crowd navigation if they are treated like permanent content types.

#### Evidence and design notes

- Which filter combinations the owner repeatedly reconstructs.
- Whether recurring retrieval is based on tags, sources, dates, completeness, or links.
- Whether remembering the last state would solve the problem without named views.
- How many named views would remain useful after several weeks.

#### Potential timing

A persistent view may fit the existing preferences
store without a new Dexie table, but it still needs a documented preference shape, backup/import
behavior, stale-reference handling, and a separately approved plan.

#### Questions for a future discussion

- Is the desired behavior "resume where I left off" or "maintain several named lenses"?
- Should query text ever be saved?
- Where would saved views live without crowding primary navigation?

#### Phase 8 overlap — 2026-08-04

The Words & phrases hub does **not** implement saved views, and the distinction is worth keeping
clear. Nothing it offers is saved or named: its five controls (where it lives, learning, view,
order, tag) originally reset on leaving. Navigation continuity subsequently changed restoration;
named/pinned views remain unbuilt. The original Phase 8 change expanded the *vocabulary* of lenses.

The broader hub controls make these design questions more concrete:

- Which of the five controls the owner reconstructs repeatedly, and in which combinations. A
  recurring pair such as "phrases, not in any page yet" or "words missing examples, tagged Mexico"
  is the concrete case for naming a view; a control that is set once and forgotten is not.
- Whether the desired capability is route restoration or named retrieval. Navigation continuity
  now covers restoration; named views would add reusable, owner-chosen lenses.

If named views are eventually wanted, the hub raises the cost slightly: a saved view would now have
to describe which surface it belongs to, since Cuaderno, Pages and Words & phrases no longer share
one control set. This is a design cost to account for in an experiment, not a reason to require
prior real use.

#### Discussion carried forward from 2026-08-12

Phase 8 deployed on 2026-08-04. The original discussion proposed asking which control combinations
recur and whether returning to a hub should restore state. Later navigation continuity addresses
part of the latter; named views remain a separate option. These questions can guide an experiment
without instrumentation or a waiting period.

---

### Personal-content provenance

- **Date added:** 2026-08-02
- **Last reviewed:** 2026-08-12
- **Status:** idea
- **Size (draft):** large
- **Touches (draft):** authorship model, editor/display, schema and backup if durable
- **Origin:** Preliminary information-architecture review and follow-up discussion
- **Potential data impact:** Medium at entry level; high at meaning/field level; intersects links,
  events, backup, dictionary boundaries, and Phase 6 AI policy

#### Description and current context

Provenance answers where information came from or how it was produced. The replaceable reference
dictionary already records source IDs, dataset versions, licensing, and stock-example attribution.
Personal items do not have a comparable structured provenance model. A personal item may link to a
source page, retain a dictionary attachment, or describe its origin in notes, but those mechanisms
do not state exactly which content came from which source.

Several questions are currently grouped under "provenance": where an expression was encountered,
which source supports a meaning, whether content was personal/imported/AI-assisted, and whether
generated content was later edited. They may require different solutions.

#### Phase 6 second-slice precedent — 2026-08-12

The persisted Diario feedback field (schema v8, 2026-08-11) is the first live AI-provenance
decision, made by architecture rather than by a provenance model: AI-produced content is stored
in its own dedicated field on the entry it judged, never mingled with the owner's prose, one per
entry with replace/remove semantics, excluded from events and recency, and staleness-checked by a
content hash of what was reviewed. That answers "how is AI *commentary* kept distinguishable" —
by structural separation.

What it deliberately does not answer is the harder half of option 5 below: provenance for AI
content that becomes *owner content* — an AI-proposed word, meaning or example the owner approves
into the notebook, where structural separation is no longer possible because the content joins
the owner's own records. That decision is still needed **before** any AI-proposes-content design
(the future proposed-entry direction in [PRODUCT](PRODUCT.md#optional-ai)), and this precedent suggests the shape of the question:
either approved content carries an origin marker, or approval is defined as adoption and the
provenance is deliberately dropped. Phase 12's dictionary-import precedent is relevant too:
imported meanings deliberately carry no link back to their source senses.

#### Potential options

1. **Informal provenance.** Continue using linked source pages, media URLs, and notes.
2. **Entry-level origin.** Record an origin type, linked source item or URL, and capture date for the
   whole entry.
3. **Multiple source references.** Allow an entry to cite several encounters or supporting sources.
4. **Field- or meaning-level provenance.** Attach origin information to a particular meaning,
   example, or note.
5. **AI-specific provenance.** Record which content was proposed by AI, what was approved, and
   whether it was later edited.
6. **Content-history model.** Preserve a fuller record of imported, generated, and personal changes.

#### Expected owner value

- Makes it easy to return to the original learning context.
- Helps assess the trust and personal relevance of a meaning or example.
- Keeps personal writing, open-reference content, source-derived notes, and future AI drafts
  distinguishable.
- Supports source-based vocabulary browsing and review.
- Prevents AI-assisted content from becoming indistinguishable from verified personal observations.

#### Risks and tradeoffs

- One entry may combine information from several sources, making one origin misleading.
- Field-level provenance can make editing visually and conceptually heavy.
- "Heard in a podcast" could be stored both as a relationship and provenance, creating duplication.
- AI model metadata may age quickly and is not itself proof of correctness.
- A content-history system would be a major expansion; current edit events do not store field values
  or act as version history.
- Personal source context may contain private information and must remain on-device under current
  policy unless deliberately included in a future AI request.

#### Evidence and design notes

- How often the owner currently records sources in notes, media links, or linked pages.
- Whether provenance is needed mainly for rediscovery, trust, citation, or AI transparency.
- Whether entries commonly combine multiple sources.
- Which content units need provenance: whole entry, meaning, example, note, or individual edit.

#### Potential timing

Source-encounter needs can be studied during a real-data audit. AI provenance must be decided
before AI-proposed content is designed, so generated content does not establish an implicit
provenance model by accident — the feedback-field precedent above covers commentary only. A
durable implementation requires its own storage and backup plan.

#### Questions for a future discussion

- Is the primary question "where did I hear this?" or "who produced this content?"
- Is a typed link to a source page sufficient for common cases?
- Must AI provenance survive later manual edits, and at what level of detail?

---

### Taller follow-ups

- **Date added:** 2026-10-17 — carried forward from the dated capture linked below
- **Status:** idea
- **Size (draft):** medium per derived option; large for combined AI/history work
- **Touches (draft):** prompt selection and screen; AI request for focused review; persistence only if needed
- **Origin:** Unresolved possibilities retained during the documentation reset; no new approval.

The owner opened the 2026-08-20 discussion because Diario could be a place for deliberate Spanish
skill work alongside reflection; serious English journaling happens elsewhere. The workshop chose
one Diario with two doors and ranked own-voice recycling below the first three chosen features.
Vocabulary sampling, weak-tense bias, scaffolds, tiers and practice events have since shipped. The
original discussion is preserved in
[history](history/IMPROVEMENT-IDEAS-HISTORY.md#diario-skill-practice-prompting-suite).

- **Own-voice recycling:** retell an old entry in another tense or rewrite past sentences with new connectors. This can derive from existing entries without new stored data.
- **AI review with a declared focus:** choose “attend to preterite vs. imperfect” at review time. This changes the workshopped review prompt and needs its own discussion and §9 disclosure.
- **Prompt memory and practice display:** no-repeat windows, a “skills practiced lately” view, category streaks, or more sophisticated stale/weak-skill proposals. Taller already records prompt/skill/tier metadata in `practice_write` and proposes the least-recently-practiced category; storing usage is no longer a hypothetical first step. New displays may derive from events; new persistent choices need explicit storage/backup design.

The capture set aside runtime prompt generation and unsolicited landing prompts for v1. Runtime
generation has its own active entry here. Ordinary reflective entries need not acquire practice
classification just because Taller can track deliberate practice.

---

### Non-verb drill extensions and practice home

- **Date added:** 2026-10-17 — carried forward from the dated capture linked below
- **Status:** idea
- **Size (draft):** medium per set; large for a new practice home
- **Touches (draft):** curated cards, grading and navigation; existing events where compatible
- **Origin:** Unresolved possibilities retained during the documentation reset; no new approval.

Contrasts already offers ser/estar, por/para and Connectors. The owner chose the first two directly
rather than waiting for AI feedback. Prepositions beyond por/para and gender/article agreement
remain open. Feedback can suggest later sets, but it is not a prerequisite. A separate sibling
practice home or gathering practice surfaces under Taller is still a product choice; the Gym kept
its name for v1. See [Confusion-pair drills](#confusion-pair-drills) for the vocabulary-side idea
and [the capture](history/IMPROVEMENT-IDEAS-HISTORY.md#non-verb-grammar-drills) for the delivered
scope.

---

### Containment and Similar proposal follow-ups

- **Date added:** 2026-10-17 — carried forward from the dated capture linked below
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** matching/proposal UI; preference/backup decision for dismissals
- **Origin:** Unresolved possibilities retained during the documentation reset; no new approval.

Suppressed-containment confirmation deliberately leaves the matcher unchanged, accepts explicit
links and stores no dismissal memory. The published 2026-08-15 diagnostic recorded 48 suppressed
rows against 83 shown: 28 artifacts, about 16 genuine misses and about four correct suppressions.
This is historical aggregate evidence, not a new inspection of owner data.

Wrong repeat proposals such as “al vino” → “venir” could motivate dismissed-pair memory; that
requires a durability decision. Prose-containment proposals on Historia are a separate possibility.
Similar-meaning proposals also need precision review: recurring noise may motivate dismissal or
matching changes, but neither should be silently added. Experiments should preserve the difference
between explained proposals and owner-confirmed edges. [Original
context](history/IMPROVEMENT-IDEAS-HISTORY.md#suppressed-containment-confirmation) and [Similar
context](history/IMPROVEMENT-IDEAS-HISTORY.md#same-meaning-clustering).

---

### Share post-attach quick actions

- **Date added:** 2026-10-17 — carried forward from the dated capture linked below
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** share continuation UI, editor navigation and draft handling
- **Origin:** Unresolved possibilities retained during the documentation reset; no new approval.

The Android share target already has a destination chooser, a continuation pill, direct lexical
creation and the later four-kind New page chooser. The initial always-new-Source behavior was
changed after the owner's TikTok use: short learning videos several times a week needed multiple
destinations.

A remaining idea is to offer targeted actions such as **Add meaning** or **Add capture** on the
continuation pill after attachment. Choose destinations and draft preservation explicitly; nothing
should save implicitly. The separate installed-PWA/share-sheet verification question belongs in
CURRENT. [Original discussion and shipped
follow-ups](history/IMPROVEMENT-IDEAS-HISTORY.md#android-share-target).

---

### Historia performance and thin-biography lens

- **Date added:** 2026-10-17 — carried forward from the dated capture linked below
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** performance measurement, derivation and optional retrieval UI
- **Origin:** Unresolved possibilities retained during the documentation reset; no new approval.

Historia derives milestones, habitats and visible-prose mentions for one item. Opening it scans
visible documents; the original disposable fixture was immediate. Measure representative larger
fixtures or an approved notebook snapshot before optimizing; memoization would be a disposable
performance mechanism, subject to the governing architecture discussion rather than a change to
canonical facts. A lens for entries with little biography is a separate product idea. [Original
evidence](history/IMPROVEMENT-IDEAS-HISTORY.md#the-words-biography).

---

### Neighborhood browsing follow-ups

- **Date added:** 2026-10-17 — carried forward from the dated capture linked below
- **Status:** idea
- **Size (draft):** medium per option
- **Touches (draft):** graph derivation and screen; storage only for durable dismissal
- **Origin:** Unresolved possibilities retained during the documentation reset; no new approval.

Sparse notebooks can produce quiet or repetitive walks. Possible experiments include weighting,
additional derived adjacency and dismissal. Each needs its own decision: v1's unweighted walk, no
stored trail and confirmed-edge authority are current behavior, not permission to add hidden state.
[Global graph visualization](#global-graph-visualization) already has its own entry. [Original
context](history/IMPROVEMENT-IDEAS-HISTORY.md#neighborhood-browsing).

---

### Tag maintenance follow-ups

- **Date added:** 2026-10-17 — carried forward from the dated capture linked below
- **Status:** idea
- **Size (draft):** medium for multi-source UI; large for undo/history
- **Touches (draft):** tag transactions, events; stored inverse data and backup for undo
- **Origin:** Unresolved possibilities retained during the documentation reset; no new approval.

Phase 20 provides exact rename, single-source merge and removal, with one edit per changed item and
an optional pre-change export. The original aim was consolidating spelling variants. Three unbuilt
extensions remain:

1. **Multi-source merge:** collapsing three spellings currently takes two previews and
confirmations. A single multi-source operation could reduce repeated work, while keeping the
destination and affected items explicit.
2. **Persistent undo:** current events lack the old tag values, so a merge cannot be reconstructed
without a prior backup. Undo needs stored inverse data and a separate backup/storage decision. A
regretted merge is not a prerequisite for exploring it.
3. **Grouped batch history:** renaming N items writes N edits visible in activity, calendar and
streak. Grouping would change the event/history contract; silently filtering existing edits would
misrepresent it.

[Original tradeoffs](history/IMPROVEMENT-IDEAS-HISTORY.md#global-tag-management). None is an
approved defect fix.

---

### Retention and direction statistics

- **Date added:** 2026-10-17 — carried forward from the dated capture linked below
- **Status:** idea
- **Size (draft):** medium
- **Touches (draft):** event derivation and statistics UI
- **Origin:** Unresolved possibilities retained during the documentation reset; no new approval.

Retention, coverage and per-direction breakdowns were excluded from Phase 11. Review events already
carry direction metadata; useful rates need enough relevant observations and honest empty states.
These are possible descriptive statistics, not requirements to track feature usage. [Frequency
coverage](#frequency-coverage) and [Review forecast](#review-forecast) hold related proposals.
[Original context](history/IMPROVEMENT-IDEAS-HISTORY.md#owner-centric-stats).

---

### Review direction and Diario cloze

- **Date added:** 2026-10-17 — carried forward from the dated capture linked below
- **Status:** idea
- **Size (draft):** large
- **Touches (draft):** review schedule/event semantics or prose matching/card generation
- **Origin:** Unresolved possibilities retained during the documentation reset; no new approval.

One Leitner ladder currently serves both review directions. Per-direction scheduling remains
deferred (originally recorded in brief §14); direction metadata exists, but separate schedules would be a behavior
decision. Cloze could draw on the owner's Diario writing rather than only an entry's assigned
examples; matching, context and grading would need care.

Optional observations include how often cloze is available, whether reverse/mixed cards are useful,
and whether the shared ladder feels appropriate. They are design notes, not a usage-review
assignment. Confusion-pair drills have their own active entry. Frequency-weighted suggestions were
rejected at capture (search misses have no entry/rank); [Frequency coverage](#frequency-coverage) is
a different display proposal. [Original
reasoning](history/IMPROVEMENT-IDEAS-HISTORY.md#learning-depth-cloze-reverse-drill-audio).

---

### Richer Diario and page possibilities

- **Date added:** 2026-10-17 — carried forward from the dated capture linked below
- **Status:** idea
- **Size (draft):** small/medium for derived UI; large for durable fields/identity
- **Touches (draft):** retrieval/prompt screens; schema, migration and backup for durable variants
- **Origin:** Unresolved possibilities retained during the documentation reset; no new approval.

The original page-profile discussion left a substantial set of possible Diario directions.
Composable pages, structured Notes, the prompt library and Taller now exist. A dated page is in
Diario only with no enabled Vocabulary/Source/Grammar structure and no Notes outline. Same-day
continuation cards and a Today-free grouped timeline shipped on 2026-08-28. These changes supersede
the capture's overall retrieval description; the Today anchor still selects the first-created
same-day entry.

| Possible direction | Feasibility and context | Design questions |
|---|---|---|
| Further prompt refinement/regrouping | Ordinary random prompts and expanded categories already exist; Taller adds deliberate skill practice | Which new choices add variety or help learning? Transient prompt changes can remain storage-free. |
| Calendar/month navigation, year summaries, journal filters | Small-to-medium derived UI over dated pages | How should retrieval complement the timeline, archive and search? |
| Continuation or prior-year memory selection | Small-to-medium domain/UI change | Compare alternatives with current grouped timeline and same-day continuations; preserve intentional selection rules. |
| Vocabulary capture from Diario | Medium; existing personal/dictionary seams | Make personal creation explicit and retain orphan handling; reduce writing interruptions. |
| Journal-specific print/export | Medium; stored entries need not change | Choose a useful, privacy-safe output distinct from disaster-recovery backup. |
| Mood, theme, gratitude, location, weather or stored prompt fields | Large if new durable structure; migration/export-first/backup design applies | Compare fields with text, tags, links and existing Taller practice metadata; do not assume a third content type. |
| Journal streaks, completion, trends or scheduled review | Medium-to-large product work; some results can derive from events | Study streak/heatmap already live in Repaso. Journal-specific additions remain deferred, with an explicit learning/reflection purpose and no pressure or stored counters. |
| Explicit/richer Journal identity, custom page kinds | Large architectural decision | Step 3 retained the structural Diario rule; a redesign remains open and needs a separate plan defining how it composes with existing structures. |

Optional context to revisit: whether the separate Diario door supports writing/rereading without
obligation; useful retrieval paths and prompt categories; whether Collection grouping/manual order
helps; and which combined page behaviors or journal-only fields are wanted. These questions preserve
the discussion without reinstating friction gates. [Original table and
discussion](history/IMPROVEMENT-IDEAS-HISTORY.md#persistent-page-profiles).

---

### Source templates and reading follow-ups

- **Date added:** 2026-10-17 — carried forward from the dated capture linked below
- **Status:** idea
- **Size (draft):** medium for creation-only recipes; large for stored management
- **Touches (draft):** page creation UI; schema/backup and provenance for durable variants
- **Origin:** Unresolved possibilities retained during the documentation reset; no new approval.

Source capability already provides optional identity plus one flat ordered capture stream,
independently enabled. Family-first creation recipes seed content without storing a template
identity; **Copy page structure** is the reuse mechanism. The initial aim was reducing blank-page
friction for a film, podcast, book or article.

User-authored templates, Source hierarchies, deeper provenance and reading tracking remain deferred
possibilities under §14. Creation-only templates may be lighter than stored template management;
compare them explicitly before adding fields or stores. [Personal-content
provenance](#personal-content-provenance) contains the cross-cutting provenance discussion.
[Original context](history/IMPROVEMENT-IDEAS-HISTORY.md#source-oriented-page-templates).

---

## Deferred ideas

### Accent bar for typed inputs

- **Date added:** 2026-08-12
- **Status:** idea
- **Size (draft):** small
- **Touches (draft):** screen input controls
- **Origin:** Brainstorming session, reviewed by the owner 2026-08-12
- **Owner interest:** The owner thinks this could be a good feature but is not interested in
  pursuing it unless something changes: their current keyboard makes adding accents low-friction,
  so the problem this solves does not exist for them today. Revisit only if the keyboard situation
  changes or typed-input friction is actually observed.
- **Potential data impact:** None; a reusable input-adornment component

#### Description and current context

A row of `á é í ó ú ñ ü` buttons above every typed input (conjugation drills, typed review modes,
any future dictation face) for phones whose keyboards make accents slow. The app deliberately
grades accents (exact-first, named near miss), so keyboard friction would otherwise grade the
keyboard rather than the owner's knowledge. One small component reused everywhere Type mode
exists.

#### Why it is deferred rather than captured

The value depends entirely on a friction the owner does not have. Recording it keeps the option
visible without implying work; the evidence that would reopen it is the owner noticing accent
entry slowing them down in a typed session.

---
