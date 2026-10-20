# Guided lessons — experience and content scope

The content direction is confirmed; only the [A1 preview](chapters/1917/REVIEW.md) is approved
for implementation. [PLAN](PLAN.md) owns delivery status; [INTEGRATION](INTEGRATION.md) owns
the proposed notebook, storage and media design.

## 1. Recommended direction

Build a small library of guided, illustrated historical explorations inside Mi Cuaderno,
opening with **1917: Una Constitución, muchas promesas**, followed by **1920: La caída de
Carranza**. These are working titles for the owner-selected topics. Keep the player modular so
the same lessons can be
previewed independently, but do not maintain a second notebook or a separate lesson app.

The intended experience is an interactive historical story with useful Spanish support:
follow a narrative, examine a document or image, investigate an optional question, and express
one idea in Spanish. It should be worthwhile even when the owner skips every exercise.

Use **1917–1940 as the first broad historical scope**, not a commitment to build every topic
immediately. The owner has already listened extensively to the Revolution through about 1918;
pre-1917 background should be optional and supplied where needed. The 1917 chapter itself is
substantive core content, not an optional refresher or a preface to 1920.

Confirmed language direction, updated 2026-10-20: accessible adult Spanish narrative with
brief English orientation, explicit Spanish focus and nearby English help. This refines the
2026-10-05 Spanish-first choice in response to the owner's concern that a full page in Spanish
can feel intimidating and effortful. Intellectual depth and Spanish difficulty remain separate
controls; difficult history need not require difficult Spanish production. Do not assume a
proficiency level from interest in history.

### Agreed language-support direction — 2026-10-20

The owner accepted the combined approach with “I think your combined approach sounds good.”
The aim is meaningful, sustainable Spanish reading, with clear priorities and accessible help;
there is no fixed Spanish/English percentage.

- Introduce a section's idea with a brief English orientation.
- Present manageable Spanish paragraphs with breathing room, without making every sentence
  another screen or required tap.
- Mark one or two focus expressions where useful, drawn from a small recurring chapter set.
  Other unfamiliar words can receive contextual help without becoming study obligations.
- Offer English directly beneath the matching passage when revealed. Prefer stacked passages
  on a phone. A “Show English throughout” control is a candidate for avoiding repeated taps;
  its exact behavior remains to be designed.
- Distinguish an English meaning summary from a close passage translation. Author and label
  each for its purpose; keep original quotations, modern paraphrases and translations distinct.
- Explain that following the main idea is enough and the marked expressions are the deliberate
  Spanish focus. Help can be opened immediately; understanding every word is not a requirement.

The current preview has page-level English summaries, glossaries and two source translations.
It does not yet implement this combined presentation. The existing six active expressions
remain the starting set; accepting the direction does not finalize new passage translations,
layout or player behavior.

Related workflow feedback: the owner supports using real text and usable visual assets in an
early visual proof, reports installing the Figma connector for use when appropriate, and is
open to a lightweight history/Spanish learning-intent outline. A natural reading session and
optional delayed recall remain options for later; the owner explicitly does not want that
session now. Keep this feedback here rather than introducing a second planning system.

Proposed next bounded task: compare two phone-sized treatments of the complete existing opening
page, showing its actual locator, English orientation, selected Spanish expressions and nearby
English in both hidden and revealed states. Use a disposable design proof before changing the
reader. This is the next proposal, not approval of application implementation or publication.

## 2. What informs this plan

The research reference was read in full from the separate remote branch
`claude/add-reference-document-0znq72`, at commit
`f1867122d53b5b4646b7b81a1820ee63362d3562`:
[Postrevolutionary Mexico research reference](https://github.com/bpanozzo23-prog/mi-cuaderno/blob/f1867122d53b5b4646b7b81a1820ee63362d3562/docs/POSTREVOLUTIONARY-MEXICO-RESEARCH-REFERENCE.md).
Its actual repository filename differs from the filename used in conversation. No branch was
switched or merged to read it.

The reference is advisory, not the product contract or a publication-ready source packet.
This plan follows [PRODUCT](../PRODUCT.md), [ARCHITECTURE](../ARCHITECTURE.md) and inspected
application code. Brief v3 is now frozen history.

| Reference idea | Proposed treatment |
| --- | --- |
| 1917–1940, with an optional earlier prelude | Adopt as the first season's scope; allow nonchronological entry. |
| Promise, policy, implementation, local response, inclusion/exclusion | Adopt as recurring historical questions, not a new dashboard. |
| History first; Spanish opens access to sources | Adopt; exercises never gate access to the story. |
| Original, glossed original, modern paraphrase, translation | Adopt explicit distinctions; author only the layers a passage needs. |
| Twelve chapters and 45–60-minute prototype narration | Use as a coverage map; begin with shorter episodes and optional depth. |
| Constitution and oil as the first prototypes | Constitution is now the owner-selected first chapter, followed by 1920; oil remains a later candidate. |
| Timeline, maps, actor directory, promise ledger, living thesis, claim graph | Start with compact orientation; defer cumulative research tools. |

Trotsky is not covered by the reference's twelve-chapter progression. Its scripts still need
their own source work. The reference supplies context, not evidence for Trotsky-specific claims.
Its exact language-load and listening prescriptions are useful editorial hypotheses, not
proven requirements: its bibliography is historical rather than language-learning research.

### Existing work and recovery

The earlier temporary lesson prototype is not present on this checkout. On 2026-10-05 the owner
reported no known downloaded copy and asked to plan on recreating it. Recreate the selected
opening chapter from a fresh, verified storyboard; recovery is not a prerequisite. If old files
later become available, inspect them as possible reference material, but do not run recovered
arbitrary HTML inside the personal-data application.

Keep new source, source notes, asset metadata, and build instructions in the repository, not
only a temporary directory. Do not silently discard the earlier general-Spanish lessons, but
do not make recovery or porting of every old lesson a prerequisite for the history pilot.

## 3. The first learning experience

### Two opening chapters: promises, then political power

Produce and accept one chapter at a time. The topics and order are confirmed; the questions,
working titles, Spanish emphasis, and storyboards below are proposed editorial treatments.

| Chapter | Historical question | Possible Spanish emphasis |
| --- | --- | --- |
| 1. 1917: Una Constitución, muchas promesas | What did the Constitution promise, whose demands did it address, and what would making those promises real require? | *Derecho*, *reconocer*, *hacer cumplir*, *sin embargo*; the draft proposes noticing legal *será* in the original eight-hour clause; contrasting a rule with its implementation. |
| 2. 1920: La caída de Carranza | How could a movement reject the president while claiming to defend the Constitution, and who would govern next? | Background versus events; cause and sequence; *apoyar*, *desconocer*, *asumir el poder*; attributing political claims. |

Each is a complete chapter with its own narrative, evidence, images, language work, and
conclusion. Provisionally allow roughly **15–20 minutes for each core reading path**, with
optional exploration and practice extending the session. This is an editorial estimate, not an
owner-set duration or a reason to compress the first chapter into a recap. Measure actual use;
narrated and bilingual reading times will differ. Longer chapters can have resumable sections.

### Chapter 1 storyboard — 1917

The [full draft](chapters/1917/STORYBOARD.md) now supplies ten core pages with Spanish narration,
English meaning summaries, two optional branches, a final response, and source/visual references.
The outline below remains the broad treatment rather than a second competing script.

1. **Open in Querétaro with a consequential question.** Can a new constitution settle what the
   Revolution was fought for? Use verified visual context and an optional compact pre-1917
   timeline, without requiring a repeat of the owner's earlier history listening.
2. **Explain the political project.** Introduce Carranza, the constituent assembly, and the
   competing demands needed to understand the chapter. Distinguish who participated formally
   from the people whose demands are discussed; select evidence before assigning viewpoints.
3. **Follow concrete concerns: land, work, and education.** Connect them to selected provisions
   of the original Articles 27, 123, and 3. Explain the Church-state dimension, including Article
   130, without conflating those provisions or turning the chapter into an article-by-article
   legal survey. Use sourced perspectives, not invented testimony from representative characters.
4. **Read a small piece of the actual Constitution.** Pair an exact original excerpt with a
   clearly labeled modern-Spanish explanation and optional English translation. Distinguish
   promulgation from entry into force and the original wording from later amendments.
5. **Test a promise against a local demand.** The draft uses Anenecuilco's April 1910 petition,
   explicitly as a look back, checked through a 2008 transcription. It establishes a demand,
   not a 1917 outcome. A Plan de Ayala comparison remains optional later depth, not a dependency.
   Explore why declaring a right and making it effective are different; do not imply that every
   promise failed or that one community represents the whole country.
6. **Offer a bounded investigation and Spanish practice.** Let the reader examine one demand
   more closely, then return to the narrative. Practice a few recurring expressions and one
   useful pattern from the actual text; most unfamiliar vocabulary receives help, not a review
   obligation. A possible response frame is *La Constitución reconoció..., pero...*.
7. **Give 1917 its own conclusion.** Synthesize what changed in law, what remained contested,
   and what evidence supports that distinction. Only then introduce the next question: who
   would have the authority and capacity to carry those promises out?

The source packet should support at least one meaningful original-text reading, one
purposeful visual, and a local or contrasting perspective. Select quality over a fixed quota.
English help opens in place without replacing the Spanish narrative or losing the reader's
location. The constitutional chapter must remain coherent and rewarding without doing exercises.

### Chapter 2 storyboard — 1920

1. Briefly bridge 1917 to 1920, including the relevant 1918–1919 developments. Do not insert a
   compulsory third chapter between the two owner-selected topics or erase that intervening history.
2. Establish the succession conflict and the relationship among Carranza, Obregón, Calles,
   and Adolfo de la Huerta, with a compact people/place guide.
3. Examine the Plan of Agua Prieta's argument: distinguish its accusations and constitutional
   claims from independently established events. Verify a Spanish original before teaching its
   wording; a diplomatic English translation is comparison material, not the Spanish source.
4. Follow Carranza's loss of support, flight and death, the provisional presidency, and
   Obregón's accession. Source consequential claims and acknowledge disputed details.
5. Return to Chapter 1: did changing the governing coalition resolve the constitutional promises,
   or change who could try to implement them? End with the problem of governing and reconstruction,
   without implying that the later political order was inevitable or all violence had ended.

The second chapter reuses the first chapter's player and source-support tools. Its new emphasis
is event-driven narrative, not a second custom lesson system.

These are story beats, not a fixed number of screens. Use a chapter outline, Previous/Next,
and a clear route back from optional material. A page should contain a meaningful scene or
argument, not one sentence solely to create more interaction.

Do not automatically grade historical interpretation as right/wrong. Objective checks need
unambiguous answers and explanations; open responses use evidence prompts and optional models.
No XP, streak requirement, completion lock, automatic vocabulary saving, or Repaso scheduling.

### Images and branching

Use images when they contribute evidence, geography, chronology, or close observation. Prefer
traceable historical photographs/documents and simple authored maps or diagrams. A period image
is not proof of everything its caption claims. Record its date, creator, provenance, rights,
caption, alt text, and any crop or modification; offer zoom when details matter.

Before including an asset or excerpt in the public repository or a release, verify its
reproduction rights and required attribution. Provenance alone is not permission. If reuse
cannot be established, link to the institutional record instead of reproducing it. Prepare
each episode in order: source packet, cited storyboard, Spanish/support text, selected assets,
editorial review, then publication checks. Preserve the original 1917 constitutional wording
where relevant, distinguish contemporary institutional names, and test national claims against
the regional evidence rather than assuming uniform outcomes.

Generated illustrations can support a clearly labeled reconstruction or a separate fictional
language story. Never present one as archival evidence or an exact reconstruction of an
undocumented event. Do not generate an image merely to fill every page.

For real history, choices determine **what to investigate**, not whether real persecution or
assassination can be beaten by choosing correctly. No invented dialogue presented as quotation.
A later fictional choose-your-own-story format can use the same player with an explicit fiction
label, without constraining the historical series to that mechanic.

## 6. Audio: prepare now, produce after the script settles

Give passages stable IDs and retain the exact approved narration text from the beginning.
Start with **one 60–90-second voice trial**, not an entire narrated season. Prefer natural adult
Mexican Spanish; assess intelligibility, proper names, pace, and whether listening is enjoyable.
Provider, voice, cost, and use rights remain decisions for that trial, not commitments here.

After accepting the trial, pre-generate reviewed audio and serve ordinary files. The player
needs no API key or per-play generation request. Initial controls: play/pause, seek, speed,
section replay, and a transcript. No autoplay. Segment-level files allow replay without building
sentence alignment first. Bind each recording to its text version so revised text cannot
silently keep an obsolete recording.

A continuous listening path and downloadable chapter audio would fit the owner's podcast
habits; add them after testing basic playback and phone background/lock-screen behavior. Do not
promise uninterrupted background playback without device verification. Optional listen-first
exercises and paragraph highlighting can follow; word-level synchronization and speech scoring
can wait.

Label modern human readings, synthetic narration, and archival recordings distinctly. A modern
reading of a quotation is not a recording of the historical speaker. Browser pronunciation can
be a fallback, but not an unconditional offline/private guarantee: voices may use local or
remote services, distinguished by
[`SpeechSynthesisVoice.localService`](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService).
The current helper chooses by language without checking that property; decide the fallback policy
before reusing it for this feature.

## 8. Expansion after the 1917 and 1920 chapters

Organize a chronological shelf, but let curiosity choose the entry point. The first two chapters
are fixed in order: 1917, then 1920. The groups below organize later expansion and the existing
opening chapters; they are not a commitment to a chapter count or to the order after 1920.

| Topic pack | Coverage drawn from the reference | What it adds to the learning format |
| --- | --- | --- |
| An unfinished revolution, 1917–1924 | Constitutional promises; Carranza/Zapatista claims; Agua Prieta; reconstruction and bargains. | Comparing legal language with demands and practical outcomes. |
| Making and contesting a nation, roughly 1921–1934 | Schools, murals, a rural community case, religious conflict/Cristeros, succession, Calles, and the PNR. | Visual interpretation, local perspectives, testimony, competing authority. |
| Reform and power, 1934–1940 | Cárdenas, land and labor, regional contrasts, oil, and asylum/international connections. | Connecting policy, sovereignty, mobilization, and political control; a later Trotsky arc fits here. |

After 1920, reconstruction under Obregón or schools/murals would provide a chronological
continuation; the next topic remains open. Oil expropriation is a later narrative/audio candidate
that can return to the constitutional questions already established in Chapter 1.

Retain **Trotsky in Mexico** as a later mini-series candidate, not the pilot or an automatic
third chapter. Its original three-part concept remains useful: why Mexico offered refuge;
life and the limits of protection in Coyoacán; and the attacks and their consequences. Its
source research and detailed production plan should be revisited when that arc is selected.

Later additions with genuine potential:

- A recurring word across episodes: how *pueblo*, *revolución*, or *soberanía* changes with its
  speaker and context. Start as curated comparisons, not an automatic knowledge graph.
- “What changed your mind?”: revisit an earlier interpretation after examining another source.
  Keep the owner's reflections in existing notebook structures where possible.
- A source detective episode: compare a speech, photograph, and report before reading the
  synthesis. Branches change the order of inquiry, not the historical outcome.
- Longer deep dives built from resumable episodes, with an optional continuous audio version.
- A separate clearly fictional illustrated-story strand for conversational Spanish and richer
  branching, using the same player where it fits.

Do not build all three narration modes, a general authoring UI, adaptive proficiency inference,
AI essay grading, detailed learner analytics, a claim graph, or the post-1940 continuation in
the first release. The research's later periods remain a future shelf, not current scope.

