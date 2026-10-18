# Candidate future data sources (survey)

Dated reference research, captured 2026-08-13; not an approved feature or a current license check. Recheck sources and licenses before adoption.

### Candidate future data sources (survey)

- **Date added:** 2026-08-13
- **Status:** Captured
- **Origin:** Owner question ("are there new data sources that might be helpful later?"),
  answered 2026-08-12 with a survey against the project's constraints (offline PWA, size budget,
  licensing discipline, Mexico preference)
- **Owner interest:** Requested for the list.
- **Potential data impact:** None to personal data; each adoption is a `sources.json` entry, a
  `DATA_SOURCES.md` record, and a dataset rebuild behind the §5 seam

#### Standing rules this survey applied

- **License quotes are recorded at download, never assumed.** Every license below must be
  re-verified by `01-download` before a byte enters the bundle; only the Wikimedia-family
  CC BY-SA sources and Common Voice's CC0 are near-certain from the survey alone.
- **Noncommercial sources can only ever be build-time validators** (the Jehle precedent): the
  public repository plus GitHub Pages redistribute everything shipped.
- **Extract more before adding more.** The existing dump still holds unshipped value (see Unused
  dictionary fields, above) and serves several needs at build time with no new download: the full
  ~114k-lemma inventory could back "Did you mean" real-word checks, etymology text could yield
  cognate hooks, and the Tatoeba sentences could yield collocation n-grams.

#### Top candidate: Kaikki's Spanish-Wiktionary extract (es.wiktionary)

The same wiktextract family, built from the Spanish Wiktionary. As an **addition** — never a
replacement; `DATA_SOURCES.md` already records why the two files are not interchangeable — it
offers the two things the English Wiktionary structurally cannot: **monolingual Spanish
definitions** (real coverage for Monolingual recall without the owner writing thousands of cues)
and **deeper regional and Mexican coverage** (native speakers document their own regionalisms
best). The license is the same CC BY-SA family. The real cost is alignment: es.wiktionary entries
will not map one-to-one onto existing canonical IDs (word + POS + etymology splits differ),
senses can disagree between wiktionaries, and Spanish definition text costs bytes. A
data-engineering project, not a bolt-on.

#### Audio — the capability gap, and why it fights the architecture

Kaikki had audio for only 5 shipped records, so audio means a new source — and every option
fights the size budget. The base bundle can never carry it; any adoption would be an optional
second download or a curated top-N subset.

1. **Lingua Libre / Wikimedia Commons word recordings** (CC BY-SA): human per-word recordings
   with clean metadata. Needs a Phase-21-style gate pass first: coverage against the shipped
   lemmas, and speaker origin — contributors skew European Spanish, which matters for a
   Mexico-preferred notebook.
2. **Tatoeba sentence audio** (the `sentences_with_audio` export): native recordings of sentences
   already shipped as examples. Audio licenses are **per contributor** and some are
   noncommercial, so adoption means per-file license filtering with NC excluded from
   distribution.
3. **Mozilla Common Voice Spanish** (CC0): the cleanest license and the weakest fit — sentence
   recordings of Common Voice's own prompts, not this app's content, in an enormous corpus.

Evidence first, before any of the three: whether device-TTS quality actually bothers the owner in
practice — the Dictation cards idea will surface this passively.

#### Probably unnecessary: relations and thesaurus datasets

The Open Multilingual Wordnet's Spanish wordnet (from the Multilingual Central Repository) and
ConceptNet (CC BY-SA) provide synonym sets, antonyms and hierarchies, but they overlap heavily
with the Wiktionary sense-level synonyms already sitting unshipped in the raw dump. Reopen only
if those prove too sparse in real use; the MCR license in particular must be verified, not
remembered.

#### Curated-content seeds (editorial work more than pipeline work)

- **Wikibooks/Wikiversity Spanish grammar** (CC BY-SA): raw material for Grammar guide depth and
  for the curated item sets Non-verb grammar drills needs — every drill item still needs vetting,
  so this is content work with a licensed quarry.
- **Wikipedia's Spanish–English false-friends list** (CC BY-SA): a small, high-value seed for
  confusable drills (*embarazada*, *actualmente*, *asistir*), curated by hand.
- **Vikidia Spanish** (the children's encyclopedia, CC BY-SA): graded reading material if
  assisted reading ever grows out of Select text to look up; until then, reading happens outside
  the app.

#### Gaps where nothing cleanly licensed exists

Recorded so future sessions do not re-search them: **CEFR-graded word lists** (the Instituto
Cervantes Plan Curricular is copyrighted; community lists have murky provenance), **collocation
databases** (the good ones are commercial; the open path is deriving n-grams from the Tatoeba
sentences at build time), and **Mexican slang dictionaries** (DEM and similar are proprietary —
§13 closes that door; es.wiktionary is the licensed partial substitute).

#### Contingency, not a feature

The main Kaikki file carries a standing "DEPRECATED" flag that `01-download` re-checks on every
run. If it ever stops being served, the fallback is running wiktextract directly against the raw
enwiktionary dump — the same data, extracted locally. Same drawer as the alias map.

#### Priority, if forced

es.wiktionary first (it serves an already-captured idea and the Mexico preference), then the
Lingua Libre coverage gate pass (cheap to measure, and it decides audio's fate), then the
false-friends seed when drills next come up. Everything else waits for its need to become real.

#### Questions for a future discussion

- Where would an optional audio download live — a second Ajustes install alongside the
  dictionary, or a per-entry fetch that compromises offline?
- Does a monolingual Spanish definition belong on the dictionary entry screen alongside the
  English gloss, or behind a display mode?

---
