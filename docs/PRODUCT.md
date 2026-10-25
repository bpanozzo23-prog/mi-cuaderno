# Product

**Current product contract, owner-approved 2026-10-17.** Together with
[ARCHITECTURE](ARCHITECTURE.md), this replaces [brief v3](mi-cuaderno-project-brief-v3.md),
which is frozen unchanged as history. The [Step 3 record](reviews/2026-10-17/STEP-3.md)
maps the previous contract and records the accepted choices. Working procedures live in the
[agent guide](AGENT-GUIDE.md). Experimental growth and the withdrawn usage review follow
[reassessment §15](reviews/2026-10-17/REASSESSMENT.md#15-owner-response-2026-10-17).

## Purpose

Mi Cuaderno is a personal Spanish learning notebook, designed first for a phone. It brings
words, phrases, writing, reading notes and practice together around the owner's interests.
It is an installable web app for one owner, with personal data in that browser's storage.

The owner welcomes adding features, trying them and removing them later when useful. An idea
does not need to solve an already observed frustration to be worth exploring. Friction is one
source of ideas. Experimentation still respects the owner's data and the agreed scope of work.
Feature usage tracking and a keep/hide/retire review are not prerequisites for new work.

## What the owner keeps

The notebook currently has two kinds of content:

- **Words and phrases:** personal entries with meanings, examples, notes, tags and connections.
  They can stand alone or attach to dictionary entries without becoming dependent on them.
- **Pages:** writing and notes that can also organize vocabulary, source passages and grammar
  examples. These structures can coexist on a page. Changing the page's focus changes its
  presentation; turning a structure off preserves its saved content.

Today a dated page appears in Diario when it has no enabled Vocabulary, Source or Grammar
structure and no named Notes outline. Feedback and Apuntes do not change that membership.
The owner chose to retain this rule. An explicit owner-chosen identity remains a possible
future redesign, not approved implementation.

The app also stores activity and preferences. The two-type rule governs notebook content;
separately designed supporting records, such as lesson progress, are allowed. A new supporting
store still needs its own approved design, persistence and backup/restore coverage. This
allowance does not itself approve a lesson store, a migration or a player.

Personal content belongs to the owner. Dictionary updates do not rewrite personal meanings.
Connections are saved by explicit action; suggestions and inferred relationships remain
explanations to consider, not facts silently added to the notebook.

## Reference and discovery

The dictionary is an optional, explicit offline download. The personal notebook remains useful
without it. Reference entries are read-only; copied meanings become independent personal text.
Missing reference data must be distinguishable from a dictionary entry that no longer exists.

The language orientation is Latin American Spanish, with a Mexico preference where the data
supports one. Conjugation presentation favors ustedes and keeps vosotros secondary. Data
attribution and source limits remain in [DATA_SOURCES](../DATA_SOURCES.md).
Adopting a data source requires checking its exact license and providing the required
attribution, including attribution for individual example sentences. Proprietary dictionary
content is excluded.

Search helps find Spanish terms and forms, English meanings, tags and notebook content, with
reasons for matches. Scoped page or vocabulary searches serve their own contexts. Matching
preserves the distinction between ñ and n: año must not become ano. Hidden page structures keep
their content but do not contribute active display, search or contextual summaries.

## Learning and writing

Scheduled Repaso, free practice, conjugation Gym and Taller have distinct purposes. Scheduled
review records grades that affect the review schedule. Free recall does not silently become a
scheduled review; Gym results do not change the vocabulary review boxes.

Taller supports prompted writing. Keeping a piece explicitly saves it to Diario; discarding it
records the practice without retaining the writing text. The app does not retain raw typed
answers from drills as learning history. Recorded activity supports review and statistics; it
does not imply permission to add feature-usage tracking.

## Optional AI

AI is off by default and requires explicit enablement, disclosure and the owner's API key.
Before enabling it, the owner must set a hard monthly spending cap in the provider console and
acknowledge doing so; the app does not enforce that cap itself. Each request is deliberate, and
the browser sends it directly to the provider with the key for authentication. The key is
excluded from backups.

**Diario review.** Claude reviews one Diario entry using its title and visible body text,
excluding Apuntes and the rest of the notebook. The latest feedback can be saved with the entry,
without rewriting the owner's text or marking it as a content edit. Changed writing makes old
feedback visibly stale. If saving fails, the response remains onscreen for that visit, but the
current interface does not identify it as unsaved.

**Pregunta.** While AI is on, a Pregunta tab holds a conversation with Claude about Spanish:
how to say something, other ways to say it, equivalents of English expressions, what a heard
phrase means. Each Ask sends the question and the conversation so far. Nothing from the notebook
is sent unless the owner attaches it: **Ask Claude** on a word, phrase or page, or on a revealed
Repaso card, attaches that entry (up to five per question) as text — its meanings, examples,
notes and page prose, the names of linked entries and, for a card, what it showed and what was
answered — never IDs, tags, links or images. Pregunta shows each attachment, the exact text to be
sent and one-tap starter questions before anything leaves the device, and the standing disclosure
says notebook entries are included. In Repaso, "Ask Claude later" queues the card without leaving
the session; "Ask now" ends the session first. An attachment never discards an unkept
conversation. The conversation lives only in memory: it survives switching tabs, and is discarded
by New question, a reload, or turning AI off. It is never stored or backed up.

**Keep.** Keep turns a Pregunta conversation, or a conversation the owner pastes from another
app, into proposed notebook entries. Before sending, it names exactly what leaves the device:
the conversation, the owner's tag names, and up to 40 related words and phrases found on the
device (term and first meaning only), led by any attached to the conversation, and any attached
words and phrases in full as they are at that moment. The owner reviews each proposal (new words
and phrases with a meaning, usage, examples and tags; connections to existing or other new
entries) and saves only what they tick, with one explicit Apply. Kept entries carry an `ia` tag
marking them as AI-proposed, which the owner may untick per entry or remove later like any tag;
once saved they are ordinary personal entries.

Keep may also propose **additions to attached words and phrases**, each ticked separately: an
example on a named meaning or in My examples, a new meaning, a paragraph at the end of the
General note, tags, and connections — including between two existing entries when at least one is
attached. Additions only append; Keep never rewrites, reorders or deletes the owner's text, never
adds to pages or to entries it saw only by name, and adds only tags and links to an attachment
that was shortened. An entry the owner changes after Claude saw it is not added to; the review
says so. Ticking an addition adopts it: it carries no AI marker, and the entry's history records
an ordinary edit.

A notebook-wide assistant that reorganizes or edits existing content (Tidy) remains a future
possibility. Any future saving of proposed content must remain explicit.

## Data safety

Personal data and replaceable reference data have separate storage. Installing, replacing or
removing the dictionary must not damage personal content. A successful content save includes
its required history; failed saves must retain the owner's draft for recovery or retry.
Deleting owner content requires confirmation.

Backups are portable JSON copies of personal content, events and eligible preferences. They
exclude the dictionary and API key. Restore validates before replacing personal data, requires
a safety export and confirmation, and commits the replacement together. There is no merge-mode
import today. A rescue export preserves recoverable raw records when validation fails, but it
is not a restorable backup and cannot authorize an upgrade or replacement.

Existing schema upgrades require an untouched, validated export before opening and changing
the old database. A genuinely optional, compatible addition may receive a lighter process only
after a specific compatibility review and owner approval, as defined in
[ARCHITECTURE](ARCHITECTURE.md#backup-and-schema-upgrades). No such exception is granted by this
reset, and the installed upgrade gate remains unchanged. Browser storage protection cannot
replace keeping backups outside the browser.

## Boundaries and future work

The current app has no accounts, application server, sync, analytics, native build or stored
file attachments. Links and supported remote images are distinct from storing files. There is
no reserved attachment store that makes future file support migration-free.

These boundaries describe current scope. A new feature requires its own bounded plan and any
necessary data-safety design; this document does not approve every future possibility. Guided
lessons remain [separate planning work](guided-lessons/README.md). The owner chose to defer the
code-license decision to separate work; dictionary attribution does not settle it.

Open ideas and their context stay together in [IMPROVEMENT-IDEAS](IMPROVEMENT-IDEAS.md), without
becoming an approved roadmap. [CURRENT](CURRENT.md) owns release and verification status;
[ARCHITECTURE](ARCHITECTURE.md) describes implementation; the [agent guide](AGENT-GUIDE.md)
owns working procedures. Historical decisions retain their reasoning and original context.
