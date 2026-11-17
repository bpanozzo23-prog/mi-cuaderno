# Interactive Spanish scenes and learning from real media

Dated research: 2026-10-28. Background for discussion, not an approved feature, implementation plan, or replacement for the guided-lessons scope.

This research examines how interactive stories, video-learning products, and conversational practice work; what their learning mechanisms can reasonably accomplish; and which ideas could support Mi Cuaderno's guided experiences or a future real-media companion.

The main finding is that three useful experiences share some infrastructure but have different responsibilities: **authored situations in which a choice changes what happens, existing media with learning support, and open conversation with a responsive partner**. A common foundation could preserve the connection between a passage, its audio, its meaning, and a chosen notebook expression. That does not require building all three products together.

## Evidence and scope

Product descriptions below come from official help, published demonstrations, public engineering explanations, or source code. They describe documented UX, not a completed hands-on audit. The browser tool reported no available browser; paid/mobile sessions were not accessed. No subscriptions were purchased, accounts created, or owner notebook data inspected. Some public pages contain old and new product descriptions together; version-sensitive findings are qualified where they matter.

**Documented** means directly supported by a source. **Interpretation** explains a likely learning mechanism or design consequence; it does not imply the vendor formally adopted that theory. **Proposed** describes a possible Mi Cuaderno design, not a claim about a competitor's private implementation. Product effectiveness is assessed separately from whether a feature exists.

The research uses primary sources where available. Vendor descriptions establish behavior and intent, not independent proof of learning. Published studies have different populations, tasks, and outcomes; they cannot establish a ranking of these products. Full-text access limitations are retained with the relevant study.

## 1. Map of the design space

| Experience | What changes when the learner acts? | Strongest reference | Main design challenge |
| --- | --- | --- | --- |
| Authored conversational scene | The next reply, scene, or outcome | Mi Vida Loca; original Duolingo Adventures; H5P | Natural dialogue, useful alternatives, manageable branches |
| Supported viewing | Help, repetition, vocabulary selection; the film stays fixed | Lingopie; Language Reactor | Accurate synchronized language support without interrupting enjoyment |
| Video as an exercise source | The task or review schedule | Yabla; FluentU; Lince | Turning recognition into recall and use without fragmenting the media |
| Capture from media into personal study | A selected encounter becomes a reusable study item | Migaku | Preserving context, ownership, portability, and meaningful review |
| Open conversation | New dialogue is generated from learner input | Duolingo Video Call; Memrise conversations | Level control, turn-taking, reliable feedback, latency |
| Sustained comprehensible viewing | Content difficulty and support, with few interruptions | Dreaming Spanish | Making content understandable and interesting enough to sustain attention |

These are overlapping patterns. A fixed film with comprehension questions is interactive learning, but it is not necessarily a branching story. A conversation can feel responsive without generating new video frames. A learner may benefit from meaningful participation without needing dozens of different endings.

## 2. Authored scenes and conversational systems

### BBC Mi Vida Loca

**Documented experience.** This historical BBC course uses a first-person filmed drama across 22 episodes, with a companion phrasebook and everyday encounters embedded in a mystery. The director's description places the learner in Spain, handling activities such as getting a cab or ordering a drink while following Merche's story. That is a particularly close precedent for the feeling proposed here: another character addresses *you*, and Spanish helps the situation proceed. [Director's trailer and production credits](https://vimeo.com/93297787)

The surviving BBC episode transcripts distinguish dramatic dialogue from interactive inserts. In episode 15, the learner is prompted to ask about tickets, buy them, and report departure information. In episode 16, elevator choices receive different responses and the learner later completes language for identifying a person. These show several interaction forms within a largely authored story; they do not establish a fully divergent narrative in which every response changes the plot. [BBC episode 15 transcript, mirrored PDF](https://www.speakspanishcloud.com/uploads/1/0/8/3/108356457/97e6f9549a0353b62b37.pdf), [BBC episode 16 transcript, mirrored PDF](https://www.speakspanishcloud.com/uploads/1/0/8/3/108356457/772ffc7254cf1c36db0e.pdf)

**Under the hood.** The original player depended on Flash, which is why current access is an archival problem. The director credits a separate interactivity team, Secuoyas. The sources reviewed do not establish its full original engine, storage schema, or branch representation. A present-day equivalent could use ordinary media clips plus authored transitions, but that is a reconstruction of the idea, not a claim about BBC's implementation. [Availability background](https://www.spanishwaterburycenter.com/learning/technology.html)

**Interpretation.** Its value is situational purpose: the learner needs information or a response to complete an immediate task. The story supplies relationships, stakes, and reasons to revisit language. This can support pragmatic learning—understanding what is appropriate to say to this person in this situation—beyond knowing a sentence's translation. The small direct study discussed in the research section is suggestive, not strong causal proof.

**Transfer.** Borrow first-person participation, recurring people, a small practical objective, and help that belongs beside the encounter. A Mexican-Spanish setting and contemporary dialogue would be newly authored content. Film production is optional; a consistent illustration, two voices, and good writing could test the same interaction concept. Do not treat archival availability as reuse permission.

### Duolingo Adventures and Speaking Adventures

**Documented experience.** The original Adventures presentation describes moving around illustrated environments, selecting responses, and completing a task such as finding a textbook or shopping. Objects and characters provide contextual clues. It also describes feedback delivered through a character's reaction: confusion or a clarification instead of only an external correctness message. Its screenshots show selectable dialogue alternatives. [Original Adventures design and demo](https://blog.duolingo.com/adventures/)

This is not the whole current picture. Duolingo's Q1 2026 shareholder letter describes **Speaking Adventures**, where curriculum-based tasks require speaking with characters. The same letter describes expanding Video Call to Super subscribers. Consequently, the older claim that the relevant experience is always multiple-choice, or that Video Call is exclusively Max, should not be treated as a current universal fact. Course, platform, and rollout must be checked in an actual account. [Q1 2026 shareholder letter, page 4](https://duolingo.gcs-web.com/static-files/aab30d54-eb91-422e-b365-c03859fea85c)

**Under the hood.** The public UX demonstrates environments, action targets, dialogue options, and task progression. Those imply coordination between scene state and dialogue state. The exact current graph format, animation stack, scoring rules, and relationship between newer Speaking Adventures and Video Call were not established by the primary sources reviewed. A screenshot of an animated character is not evidence of generated video or unrestricted conversation.

**Interpretation and transfer.** Situations can test whether a response accomplishes a purpose rather than whether it matches a translation. Contextual consequences can make feedback easier to understand. However, an in-world misunderstanding may not explain *why* a phrase failed; an optional brief explanation can complement the character response. Multiple alternatives may be valid, and a learner should be allowed to clarify, repeat, or change their mind. A decorative map is less important than the dialogue task itself.

### Duolingo Video Call and Roleplay

**Documented experience.** Video Call is spoken conversation with an animated character; Roleplay frames conversation around a situation. Duolingo describes post-call transcripts and roleplay feedback. These features are different from playing a prerecorded video, and different from selecting an authored answer. [Max feature descriptions](https://blog.duolingo.com/duolingo-max/)

**Documented orchestration.** Duolingo explains that learning designers write instructions controlling character, difficulty, purpose, and assistance. Calls have an opener, an initial question, an exchange, and a controlled close. A preparation step generates a suitable first question. After a call, a model extracts facts from the transcript; those facts can be supplied in future prompts. This is explicit evidence of structured prompting and summarized conversational memory, not proof of a particular vector database or permanent model training on the user. [AI and Video Call design](https://blog.duolingo.com/ai-and-video-call/)

The current speech recognition, voice generation, animation synchronization, network pipeline, and model version are not fully documented in those sources. A 2025 research report identifies the model used **during its study**; it should not be presented as today's guaranteed stack.

**Interpretation and transfer.** This offers open production and conversational repair that answer buttons cannot supply. It also introduces recognition errors and ambiguity: a transcript mistake is not necessarily a learner mistake, and a successful exchange does not prove grammatical accuracy. A comparable future feature should separate hearing the learner, interpreting their intent, continuing the scene, and giving feedback. A typed fallback, a visible transcript, and explicit control over any retained personal facts would each address a different problem. None requires that the first authored-scene experiment use runtime AI.

### H5P Branching Scenario and Interactive Video

**Documented experience.** H5P is an authoring/runtime reference rather than a Spanish course. Branching Scenario connects content nodes and alternatives to different destinations and endings. Its public examples include a filmed home-visit simulation and a non-video arts exploration. Interactive Video instead places interactions on a timeline; responses can seek to another point. Thus H5P demonstrates both a graph of separate scenes and adaptive navigation within one video. [Branching examples](https://h5p.org/branching-scenario), [Interactive Video examples](https://h5p.org/interactive-video)

**Source-verified implementation.** The Branching Scenario schema contains a list of typed content records, destination fields such as `nextContentId`, configurable navigation, and scoring settings. Its runtime maintains the current node and user path, stops playback during transitions, handles backwards navigation, and can restore supplied previous state. It also emits learning activity statements through xAPI, a standard for communicating learning events. Emitting an event is distinct from storing it durably. [Content schema](https://github.com/h5p/h5p-branching-scenario/blob/master/semantics.json), [Runtime source](https://raw.githubusercontent.com/h5p/h5p-branching-scenario/master/src/scripts/h5p-branching-scenario.js)

The `.h5p` format is a ZIP package containing definitions, content parameters and media, and required code libraries. This portability is useful, but the package is not merely harmless lesson JSON. Its runtime dependencies and hosting integration have to be considered. [Package specification](https://h5p.org/documentation/developers/h5p-specification)

**Transfer.** Use H5P to understand authoring and branch review, and potentially to test a standalone scenario. Adopting it inside Mi Cuaderno would need a separate decision about weight, styling, accessibility, packaging, and personal state. The project's current proposed lesson architecture permits a limited trusted renderer, not arbitrary imported executable packages. The useful lesson is the separation of content from player behavior; installing H5P is not required to obtain it.

### ink as an additional authoring reference

inkle's open-source **ink** language is designed for branching narrative and dialogue. It supports named passages, choices, conditions, variables, and recombining branches; its documentation explicitly addresses keeping frequently branching dialogue manageable. The compiler/runtime separation makes the story script distinct from its visual presentation. [Project](https://github.com/inkle/ink), [Authoring guide](https://raw.githubusercontent.com/inkle/ink/master/Documentation/WritingWithInk.md), [Runtime format](https://github.com/inkle/ink/blob/master/Documentation/ink_JSON_runtime_format.md)

**Transfer.** A response can change a local exchange and then rejoin a common scene. Keep a small remembered fact, such as ordering tea rather than coffee, so later dialogue remains coherent. That can create meaningful agency without producing an entirely separate episode for each combination. ink is not a language pedagogy system: glosses, translations, audio, review, and notebook integration would still need design. For a small pilot, plain structured records may remain easier than another authoring language.

## 3. Learning from existing media

### Lingopie

**Documented experience.** Choose entertainment, watch with language support, inspect an unfamiliar subtitle word, and revisit it later. Lingopie's help says a clicked word is translated and added to a word bank. Its beginner guide describes flashcards that return to the scene where the word occurred. This keeps an expression connected to a voice and situation instead of requiring manual copying into another tool. [Introduction](https://help.lingopie.com/support/solutions/articles/150000076255-what-is-lingopie-and-how-to-learn-with-it-), [Contextual review guide](https://lingopie.com/blog/lingopie-how-to-get-started-as-a-beginner/)

The documented player offers adjustable speed, subtitle looping, automatic pause at subtitle boundaries, grammatical color coding, and recording a word or full caption for a pronunciation score. These are different learning actions: replay increases exposure, pausing gives processing time, and repeating asks for spoken production. The score's existence does not establish its validity across accents or its ability to measure conversation. [Player features](https://help.lingopie.com/support/solutions/articles/150000076263-how-to-use-video-features-on-lingopie-)

**Under the hood.** Its terms describe owned/acquired and third-party licensed content. Its extension help describes integration alongside online video and vocabulary saving, with internet required. This supports a catalog-plus-learning-service model, but does not reveal its databases, transcript production system, tokenization, scheduling algorithm, or speech model. Broad extension compatibility wording should be checked against a specific service, title, and device. [Content categories](https://lingopie.com/terms-of-service), [Extension help](https://help.lingopie.com/support/solutions/articles/150000219258-how-does-the-lingopie-extension-work-)

Current help explicitly describes offline downloads only in its iOS app, with up to ten eligible videos. This is not a general offline guarantee for its web player, extension, or every title. [Download instructions](https://help.lingopie.com/support/solutions/articles/150000174886-how-to-download-content-on-your-ios-mobile-app-)

**New adjacent example.** Lingopie's October help describes **Drama Rizz**, a separate iOS companion with vertical micro-dramas, including Spanish, its own account, and its own subscription. It is a useful reference for short, phone-oriented narrative content. The available description does not establish branching choices or learning efficacy. [Drama Rizz introduction](https://help.lingopie.com/support/solutions/articles/150000232546-what-is-drama-rizz-)

**Transfer.** The strongest ideas are continuous viewing with optional intervention, effortless line replay, and preserving the source moment during review. Mi Cuaderno should probably keep lookup separate from intentional saving: understanding a word once is not necessarily a request to add it permanently or schedule review. That is a product choice, not a criticism of Lingopie's different goals.

### Yabla

**Documented experience.** Yabla organizes playback around caption-associated segments. Back, skip, loop, and exercises reuse those boundaries. Original and translated captions can be hidden independently; dictionary help identifies its sources, and literal word glosses are distinguished from idiomatic translations. A public tutorial documents normal and slower speeds and automatic pause options. [FAQ](https://www.yabla.com/faq_group.php), [Public tutorial player](https://english.yabla.com/player_cdn.php?id=14619&tlang_id=en)

**Scribe** asks the learner to transcribe an entire caption from the audio. It marks correct and incorrect letters and accent problems separately; the learner can replay, slow down, or reveal missing information. The described flow requires a completed correct caption before continuing, with help available to finish it. Scores incorporate support use. This is dictation against a known transcript, not free conversation. [Scribe tutorial](https://www.yabla.com/yabla-blog/the-language-learning-game-for-dictation-introducing-scribe/), [scoring FAQ](https://english.yabla.com/faq.php)

**Under the hood.** Timed caption boundaries are explicitly shared by viewing and practice. Comparing typed input with a reference transcript and providing localized hints is a reasonable explanation of the required functionality, but the exact alignment/scoring algorithm is proprietary. Yabla calls Scribe patented; its learning purpose can inform our discussion without assuming its implementation is available for copying.

**Interpretation and transfer.** Yabla is especially useful for studying deliberate listening: hear a short span, attempt it, inspect what was missed, and hear it again. Spelling and accents provide diagnostic detail, but they should not be conflated with understanding spoken meaning. For Mi Cuaderno, an optional listening exercise could distinguish “I heard the words” from “I spelled them correctly.” Replaying or opening help need not carry a penalty. The app's normal review system should not infer broad mastery from a dictation score.

### FluentU

**Documented experience.** Curated authentic videos connect to clickable word information, examples, quizzes, a vocabulary collection, and later review. Translated transcripts can also be printed. Compared with Lingopie's entertainment-first presentation, FluentU's documented flow makes the vocabulary and exercise network particularly prominent. [Product explanation](https://www.fluentu.com/help/about-fluentu/), [Usage guide](https://www.fluentu.com/help/how-do-i-use-fluentu/)

**Documented implementation details.** Its help says the review scheduler is a variation of SuperMemo SM2. This is a rare concrete algorithm disclosure, but does not prove that its timing is individually optimal. Another page says videos use official YouTube embeds from owners who allow embedding; the teaching layer is separate from the video host. [SRS explanation](https://www.fluentu.com/help/what-is-the-fluentu-srs-spaced-repetition-algorithm/), [Embedding explanation](https://www.fluentu.com/help/are-there-copyright-issues-since-you-use-youtube-videos/)

Its help distinguishes streaming video from downloadable study materials. The YouTube extension requires an active subscription, login, a video with captions, and captions enabled. That dependency chain is a useful correction to the impression that any video can instantly become an equally rich lesson. [Video download limitations](https://www.fluentu.com/help/can-i-download-videos-to-watch-offline/), [Offline study](https://www.fluentu.com/help/can-i-download-the-videos-to-study-offline/), [Extension instructions](https://www.fluentu.com/help/how-to-use-the-fluentu-chrome-extension-on-youtube/)

**Transfer.** A useful expression can link several source encounters and several kinds of practice. The scheduled-review layer should be separate from the media player, so returning to a word does not always mean replaying an entire lesson. In Mi Cuaderno, recognizing one written form should not automatically establish familiarity with every meaning or spoken realization of it. Shared vocabulary can connect experiences without flattening their different learning demands.

### Language Reactor

**Documented experience.** The official extension listing describes dual subtitles, popup dictionaries, detailed playback controls, Netflix/YouTube support, and text import with translation and text-to-speech. Desktop/laptop Chrome is the stated target. Account features include saved words/phrases and additional subtitle/translation support. [Official extension listing](https://chromewebstore.google.com/detail/language-reactor/hoombieeljmmljlkjmnheibnpciblicm?hl=en-US), [Account feature page](https://www.languagereactor.com/login)

**Why its design matters.** In a creator interview, the developers describe an earlier local-video approach that required learners to find both video files and matching subtitles. The extension reduced that preparation burden by meeting learners in an existing viewing environment. They also identify mismatching dubbed soundtracks and subtitles as a serious problem. This is a historical explanation of the design, not current backend documentation. [Creator interview](https://languagelearningwithnetflix.com/interview.html)

The creator's original PhrasePump announcement describes practicing words through different sentences and emphasizes listening. That is an interesting alternative to repeatedly showing exactly the same card. Its current detailed behavior was not verified, so it is best treated as a design precedent. [Creator's 2022 announcement](https://news.ycombinator.com/item?id=33400090)

**Under the hood and transfer.** An extension adds UI and behavior around supported third-party pages. That makes it distinct from hosting a catalog or controlling our own player. The exact current caption extraction, recognition, and ranking systems remain unknown. Public roadmap ideas are not shipped-feature evidence. A phone-focused PWA cannot assume desktop extension capabilities; supporting arbitrary sites would add permissions, site-specific adapters, and maintenance when those sites change. The transferable idea is letting the owner bring their interests, rather than requiring our lesson catalog to contain everything they want to watch.

### Lince

**Documented experience.** The method is unusually specific: watch a short scene, inspect/replay its key phrase, reconstruct the phrase from word tiles before replaying it, then choose among three responses to a different everyday situation. Feedback explains fit. Later review again attempts recall before showing the clip. The company distinguishes completion from later recall and explicitly says neither certifies independent speaking. It cites general research as design rationale while saying those studies are not trials of Lince. [Methodology](https://getlince.app/methodology/)

**Under the hood.** Its content page says clips play in YouTube's official embedded player, with Lince supplying transcripts, translations, glosses, drills, and review. Unavailable clips are removed from the catalog. That is a clear example of separately authored learning material around externally hosted media. One documentation inconsistency remains: the content page describes hand-checked transcription, while methodology warns about automatic source captions. Actual transcript quality needs sampling. [Content model](https://getlince.app/content/)

Its main positioning is short A1–B1 scenes in Spanish from Spain. Such labels indicate editorial targeting, not certification. [Product page](https://getlince.app/)

**Transfer.** Lince is the most direct bridge between the two feature ideas: a fixed source scene can introduce an expression, and a new authored situation can ask the learner to use it. The original movie need not branch. Word tiles supply substantial support, so adding an optional attempt before revealing the tiles would test a different skill. One expression, one encounter, and one transfer situation would make a bounded experiment possible without committing to a streaming catalog.

### Migaku

**Documented experience.** Select a subtitle word, inspect it, and create an editable card containing the source sentence and media context, including screenshot/audio. The documented workflow can send cards to Migaku Memory or Anki. Its FAQ distinguishes mobile YouTube from broader desktop support, describes offline flashcard review, and discusses shadowing without claiming a dedicated pronunciation-practice tool. [Card-creation demonstration](https://migaku.com/blog/youtube/card-creation-from-video-content-migaku-browser-extension), [Usage FAQ](https://migaku.com/faq/goals)

**Under the hood.** The public workflow demonstrates capture, editing, media association, and a handoff to a separate review system. The precise capture implementation and learning scheduler are not established here. Its product also describes known-word tracking and comprehension estimates. Those estimates are selection aids; vocabulary familiarity alone cannot guarantee understanding of speech rate, accent, grammar, or implied meaning. [Product description](https://migaku.com/)

**Transfer.** This is especially relevant to Mi Cuaderno as a personal notebook. Preserve *the encounter* with the phrase: where it occurred, what it meant there, and why the owner kept it. A URL, timestamp, selected short expression, and owner note is a smaller capability than extracting and storing audio/screenshots. The latter introduces attachments, rights, size, and backup requirements. Neither should silently become mandatory for saving a useful expression.

### Memrise and its Stories direction

**Documented experience.** Official help describes vocabulary learning, native-speaker video, and AI conversation as related experiences. “Scenario” has also been used for a themed vocabulary collection; it should not be taken as proof of a branching visual narrative. Its word details can connect natural/literal meaning, media examples, and pronunciation practice, with availability varying by language and item. [Help](https://explore.memrise.com/help)

The updates page announces Stories at several levels, including Spain and Mexico Spanish, linking a separate web experience. The linked app was inaccessible through the research tool, so its interactive behavior remains unverified. The update page itself mixes older and newer dated sections; the announcement establishes the direction, not a complete current user journey. [Updates and Stories link](https://www.memrise.com/blog/changes-to-the-memrise-app)

An official public product-requirements document describes Learned/Heard/Used distinctions, video readiness, conversation missions, and a Build/Learn/Perform preparation sequence. This is a valuable **design snapshot**, not verified production source or evidence that every feature ships everywhere. [Public PRD](https://github.com/Memrise/memrise-prd/blob/main/README.md)

**Transfer.** Let expressions connect experiences, while distinguishing what happened: reading, hearing, choosing, recalling, and freely using are different. Mi Cuaderno should not adopt persisted “mastery” labels from another product without its own definition and event design. A connection between modes is useful even with no global proficiency score.

### Dreaming Spanish as a useful contrasting design

Its beginner approach uses drawings, gestures, and expressions to make spoken stories understandable, while its FAQ recommends attending to overall meaning rather than continually looking up words. It offers content ranging from very accessible learner material toward more demanding viewing. This is an input-first product philosophy, not a branching system. [Method and FAQ](https://www.dreaming.com/faq), [Beginner visual support](https://dreamingspanish.freshdesk.com/support/solutions/articles/158000407270-i-m-completely-new-to-spanish-can-i-dive-right-into-your-content-or-do-i-need-to-study-first-)

**Transfer.** Some sessions should allow a person to enjoy and understand a story without constant testing. Visuals can carry meaning rather than merely decorate. However, we need not adopt the entire philosophy about avoiding lookup or delaying other activities. The evidence below supports both meaningful exposure and deliberate practice; it does not establish that one rigid method is necessary for every adult learner.

## 4. What the learning evidence supports

### Comprehensible input and captions

**Comprehensible input** means language the learner can understand sufficiently to follow its message, using what they know plus context and support. Calling a clip authentic or assigning it A1 does not establish that a particular learner can understand it. The relevant question is whether they can follow the situation without exhausting all their attention decoding words.

Kurokawa, Hein and Uchihara's 2025 meta-analysis synthesized 49 independent experiments, with 89 effect sizes. Captioned viewing had a moderate vocabulary advantage over uncaptioned viewing, **Hedges' g = 0.56**. This is a standardized effect, not a 56% improvement. Only eight eligible studies included delayed tests, limiting conclusions about retention. The review also cautions that novice learners can struggle with the combined demands. **Design implication:** offer accurate Spanish captions and manageable material; do not assume captions rescue an incomprehensible video. [Full review, first published December 2024](https://onlinelibrary.wiley.com/doi/full/10.1111/lang.12697)

The same review explains why the general multimedia “redundancy” principle should not be used to remove captions: second-language text can support speech processing rather than merely duplicate it. Spanish captions and English translations also do different jobs. One connects sound and written Spanish; the other helps establish meaning. The research does not dictate one permanent subtitle configuration for every user and purpose.

### Recognition, recall, listening, and transfer are separate outcomes

Montero Perez and colleagues' 2014 experiment involved 133 undergraduates watching French clips under four caption conditions. Captions helped word-form recognition and association with the clip, but did not improve meaning recall or comprehension in that particular experiment. **Design implication:** a correct option after viewing is useful evidence of that task, not proof that the expression can be produced independently. [Study](https://www.lltjournal.org/item/686/)

A particularly relevant 2025 study by Montero-Perez and Pattemore examined 37 low/intermediate Spanish learners watching a 72-minute TV episode. Viewing improved speech segmentation on treatment and related sentences, but not unrelated sentences; captions did not add a clear benefit on that outcome. The small sample and shadowing-based measure limit generalization. **Design implication:** familiar voices and recurring characters may help acclimatization; later practice should vary voices and situations if broader listening transfer matters. [Research paper](https://diposit.ub.edu/bitstreams/3f79e4dd-7c96-44a7-8cd4-f3d8740ce3ba/download)

These findings are compatible: vocabulary recognition and speech segmentation are different outcomes. Neither study establishes that captions are universally necessary or unnecessary.

### Contextual help and selective attention

A **gloss** is a short explanation of a word or expression beside the material being read. Yanagisawa, Webb and Uchihara's 2020 meta-analysis examined 42 studies with 3,802 participants and found higher immediate and delayed vocabulary learning from glossed than nonglossed reading. First-language glosses generally outperformed second-language glosses. Applying reading findings to video subtitles is a reasonable design hypothesis, not direct validation of a particular player. [Study](https://doi.org/10.1017/S0272263119000688), [author manuscript](https://researchmap.jp/akifumiyanagisawa/published_papers/27620770/attachment_file.pdf)

**Design implication:** nearby English help is legitimate support. Explain the expression as used here; let the learner reveal more detail if wanted. Selective highlighting can direct attention to a useful form, but making every word a required task risks displacing the original message. The number of focus expressions should follow the scene and the owner's experience, not an unsupported universal quota.

### Retrieval and spacing

**Retrieval practice** means trying to bring an answer to mind before seeing it. In Karpicke and Roediger's 2008 foreign-language vocabulary experiment, continuing retrieval after initial success substantially improved delayed recall, while continued study alone did not produce the same benefit. This is evidence for attempting recall, not proof that all multiple-choice quizzes produce conversational skill. [Original study](https://doi.org/10.1126/science.1152408)

Kim and Webb's 2022 meta-analysis of 48 experiments with 3,411 participants supports spaced second-language practice. Longer spacing helped delayed outcomes relative to shorter spacing, while equal and expanding schedules were statistically equivalent overall. No universal interval or proprietary scheduler is validated by this result. [Review](https://onlinelibrary.wiley.com/doi/abs/10.1111/lang.12479)

**Design implication:** a later prompt could show the situation and ask what the learner would say *before* replaying the model line. Subsequent practice could change one detail. This would be different from merely replaying a favorite scene. A sophisticated adaptive scheduler need not precede a small experiment, and joining notebook review remains an explicit product decision.

### Interaction, output, and feedback

**Negotiating meaning** includes checking understanding, asking for repetition, and repairing misunderstandings while accomplishing something. Mackey's 1999 study of 34 adult English learners linked active task-based interaction with grammatical development. Its human interactions are richer than clicking a scripted response, so it does not validate branches as an equivalent substitute. [Study](https://www.research.lancs.ac.uk/portal/en/publications/input-interaction-and-second-language-development-an-empirical-study-of-question-formation-in-esl%28f620e7aa-6688-4bb4-908f-c3302e011a62%29/export.html)

Lyster and Saito's 2010 meta-analysis covered 15 classroom studies and 827 learners. Oral corrective feedback had durable benefits; prompts encouraging repair generally had larger effects than corrected reformulations, called **recasts**. Classroom findings do not prescribe constant correction in an app. [Full paper](https://kazuyasaito.net/SSLA2010.pdf)

**Design implication:** include helpful conversational moves such as asking someone to rephrase. Let a character clarify naturally, then optionally explain the language or invite a retry. If speaking is a goal, eventually ask for an unaided spoken response or a meaningful new sentence. Reading aloud a supplied line, reconstructing it from tiles, and composing it oneself should remain distinct activities.

### Visuals, pacing, and cognitive load

Mayer and Moreno's 2003 multimedia-learning paper explains limited processing capacity and strategies such as segmenting, pretraining, and removing extraneous material. Its foundational tasks were not primarily second-language dramas, so application here is informed design rather than direct validation. [Paper](https://www.uky.edu/~gmswan3/575/9_ways_to_reduce_CL.pdf)

**Design implication:** orient the learner briefly, let them control pace, and put help beside the relevant language. Stop new dialogue while asking for a substantial response. Show gestures, objects, or expressions when they explain meaning. Decorative motion, background sound, two subtitle streams, a glossary, and a decision menu all compete for attention if presented simultaneously. More sensory material is not automatically more learning.

### What evidence specifically supports narrative, games, or these products?

Dixon, Dixon and Jordan's 2022 meta-analysis of digital game-based language learning included 26 eligible studies. Between-group designs yielded a positive weighted effect around **d = 0.50**, but varied games and measures prevent attributing the benefit specifically to narrative, branching, animation, or rewards. **Design implication:** goals and meaningful consequences are worth exploring, while enjoyment and transfer need separate assessment. [Review](https://www.lltjournal.org/item/10125-73464/)

The directly relevant **Mi Vida Loca** study by Gómez Soler and O'Neill (2016) involved only 15 students across two existing sections: seven with video and eight with worksheets. It examined pragmatic responses after five episodes. Groups were unequal before treatment, were not randomly assigned, and repeated the same assessment tasks. Teacher-mediated video use also differs from independent app use. It is a useful example of teaching appropriate requests and responses, but weak causal evidence that interactive video is superior. [Full paper](https://files.eric.ed.gov/fulltext/EJ1207900.pdf)

Lyu and colleagues' 2025 chatbot meta-analysis included 31 comparative studies and 41 effect sizes, with a positive overall result but high heterogeneity. Twenty-eight studies concerned English and only one Spanish; systems and outcomes varied. The pooled result combined affective and learning measures, so it must not be described as a general speaking-proficiency gain. [Review](https://onlinelibrary.wiley.com/doi/10.1111/ijal.12668)

Duolingo has also published a 2025 Video Call study of Japanese learners of English. Its population, intervention, and vendor authorship must remain attached to any claim; it is not evidence about Spanish multiple-choice scenes. Full-report retrieval returned HTTP 403 in this session; the report is retained as a relevant reading lead rather than used here to rank products or assert a verified effect size. [Vendor research report](https://duolingo-papers.s3.amazonaws.com/reports/Duolingo_whitepaper_language_video_call_improves_speaking_2025.pdf)

A Yabla/LoMásTv-specific paper by Pardo-Ballester (2012) reports perceptions and pre/post learning outcomes. Full primary text was unavailable through the research routes, leaving its comparison design unverified. Its abstract or Yabla's summary should not be converted into a causal effectiveness claim. [Paper identifier](https://doi.org/10.11139/cj.29.3.532-547)

### Real media can be valuable without constant exercises

Peters and Webb (2018) found incidental vocabulary learning from full-length television in two experiments with Dutch-speaking learners of English. Occurrence frequency, prior vocabulary knowledge, and cognateness influenced learning. This supports allowing meaningful viewing to remain viewing; it is not proof of any named service or of broad speaking gains. [Study](https://doi.org/10.1017/S0272263117000407)

Durbahn and colleagues' 2024 experiment manipulated lexical coverage in documentary viewing. Lower familiarity reduced comprehension. Artificial word substitutions and specific comprehension criteria make its reported thresholds unsuitable as a universal “you must know 95%” product gate. **Design implication:** topic familiarity, vocabulary, speed, accent, and visual support should all inform selection. A known-word percentage can be a hint, not a certification that a clip will be understandable. [Study](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/lexical-coverage-in-l1-and-l2-viewing-comprehension/DFCA6605076705D5762C98F286D16B27)

### Match an eventual check to the intended benefit

The following is a proposed evaluation menu, not an assessment requirement for the owner or a validated test battery.

| Intended benefit | A more appropriate check | What does not establish it alone |
| --- | --- | --- |
| Follow the story | Explain the gist or choose an appropriate consequence | Finishing playback |
| Understand spoken Spanish | Interpret a line with its text hidden | Reading the translation |
| Recall an expression | Produce it before choices or a model appear | Selecting it among visible alternatives |
| Respond appropriately | Give a plausible reply to a situation with several acceptable answers | Exact match to one preferred wording |
| Retain useful language | Try again after a delay | Immediate success after replay |
| Transfer beyond the source | Respond to changed wording, voice, or situation | Repeating the same memorized clip |
| Enjoy sustainable practice | Want to continue; find the support sufficient | Points, streaks, or time spent alone |

## 5. Technical implications for a future feature

### A shared language layer with separate experience controllers

The following is a proposed design derived from the comparison, not an assertion about any vendor's internal data model. A useful shared unit is an **encounter**: a phrase or passage as spoken or written at one identifiable moment in a source. It can connect several experiences without turning every encounter into a permanent vocabulary item.

| Information | Purpose | Example |
| --- | --- | --- |
| Source identity and revision | Return to the right material and detect changes | Authored café scene, revision 2; or a provider video ID |
| Passage/cue identity | Keep references stable as content changes | `server-takeaway-question` |
| Timing and speaker | Replay the relevant line and identify who says it | Start/end seconds; server |
| Exact Spanish | Show what was actually spoken | A verified transcript, separate from a paraphrase |
| English help | Support meaning without replacing the Spanish | A close translation plus an optional usage explanation |
| Expression span | Attach help to a whole useful expression | `para llevar`, not only `llevar` |
| Provenance and review status | Distinguish authored, transcribed, translated, and generated material | Transcript checked against audio; translation reviewed |
| Optional learner action | Keep a phrase or example intentionally | Preview an addition to an existing notebook entry |

The **scenario controller** decides which scene follows a choice. The **media controller** synchronizes a fixed recording with its transcript. The **practice controller** decides what to ask the learner to retrieve. An **AI conversation controller**, if later added, generates and manages turns. They can share language support without becoming one large universal player.

This does not propose a personal database schema. The current lesson preview, notebook item identities, dictionary attachments, event-derived learning state, and backup contracts must remain distinct until a bounded integration design is approved.

### What makes captions interactive

WebVTT supplies timed text cues with start and end times. That is enough to synchronize a transcript, highlight the current line, or navigate to a passage. It does not automatically supply accurate translations, word meanings, word-level timestamps, or phrase selection. Those are additional data and interaction layers. [WebVTT concepts](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API)

A practical first player could use sentence-level timing and phrase-level help. Selecting `me di cuenta` should offer the expression's meaning in context rather than three unrelated dictionary glosses. Spanish clitics, contractions, conjugated forms, and multiword expressions make naive splitting on spaces insufficient for high-quality help. Those linguistic observations motivate editorial annotation; they do not require building a complete linguistic parser first.

For material whose use is authorized, an automated preparation pipeline could draft a transcript, align it to the recording, suggest expressions and translations, and flag uncertain passages for review. **Forced alignment** means locating supplied transcript words in audio; it does not prove the words or translation are correct. WhisperX is a public example combining transcription with alignment and speaker-related processing, not a claim that the products above use it. [WhisperX project](https://github.com/m-bain/whisperX)

For authored scenes, the approved script should drive the recording, and the recording should be checked back against that script. For existing media, the audible recording should govern the transcript. A dubbed soundtrack may differ from a separately translated subtitle track; such a track should not silently become the answer key for dictation.

### Three substantially different ways to use real media

| Approach | What we control | What remains external | Relative scope |
| --- | --- | --- | --- |
| Curated embedded clips with prepared learning notes | Selection, transcript/help we are entitled to use, activities, notebook handoff | Provider playback, availability, ads and embedding rules | A bounded early experiment |
| Own or licensed media packs | Audio/video, transcript, timing, distribution, offline packaging | Production or licensing arrangements | More editorial work; more predictable experience |
| A companion across arbitrary streaming sites | Extension UI and some integration logic | Site changes, subscriptions, caption access, device support and provider restrictions | A separate ongoing integration product |

YouTube's official iframe API supports playback control, seeking, and player-state events. Its caption download API separately requires authorization and permission to edit the video. Therefore, **a publicly watchable video is not automatically a publicly downloadable transcript through the official API**. A curated clip with separately prepared support is technically different from promising arbitrary URL import. [Player API](https://developers.google.com/youtube/iframe_api_reference), [Caption download requirements](https://developers.google.com/youtube/data/reference/rest/v3/captions/download)

A normal PWA cannot inspect arbitrary cross-origin player internals as if they were its own page. Browser security restricts that access; supported provider APIs are the intended bridge. An extension has a different permission and maintenance model, so Language Reactor-like behavior is not simply another view inside Mi Cuaderno. [Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)

YouTube's developer policies prohibit API clients from offering unauthorized offline downloads or separating audiovisual components. Those restrictions matter to a proposed clip-saving or audio-export feature. Ownership of annotations, permission to reproduce subtitles, permission to redistribute media, and the ability to embed playback are separate questions. A competitor offering a capability is not proof that our intended source or use is permitted. [YouTube developer policy guide](https://developers.google.com/youtube/terms/developer-policies-guide)

### Content production is an ongoing part of the system

For an authored scene, a proposed workflow is: choose one communicative goal; draft dialogue and alternative responses; review the Spanish and situation; storyboard the visual information; record or generate reviewed voices; assign stable passage IDs; implement transitions; then walk every path. Changing a line should invalidate any recording, translation, or exercise that depends on it.

For a real clip, the workflow changes: establish the source and usable permissions; check availability; verify transcript and timing; select a few worthwhile expressions; prepare concise help; design optional recall or transfer; and retain enough source context to explain the expression later. A removed video should leave the owner's saved writing understandable.

Full animation adds continuity work for characters, props, camera position, lip movement, and alternate clips. Still images with distinct voices reduce that burden. If the point is a gesture, action, or spatial relationship, motion may be instructionally useful. If the point is an ordinary spoken exchange, audio and writing quality may matter more than continuous motion. This is a design hypothesis to test, not an established comparison of the proposed formats.

### Durability and offline access

Downloaded lesson assets are replaceable content; personal writing and saved meanings are not. The existing [integration proposal](../guided-lessons/INTEGRATION.md) already makes that distinction and proposes per-episode media packs. Browser storage quotas and eviction mean that availability needs verification rather than a blanket offline promise. [Browser storage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

Future packs should show size, completion, failures, and removal. Saved notebook entries should carry a human-readable source description and relevant text, not depend solely on a working timestamp URL. Removing downloaded assets must not remove personal annotations. New durable resume state, recording storage, learning events, or attachments require their own approved storage and backup design.

## 6. Implications for Mi Cuaderno

### A learning sequence worth exploring

My synthesis is a flexible sequence: **understand the situation → experience some Spanish → notice something useful → respond → see the consequence → revisit later in a changed context**. It combines supported input, selective attention, output, and retrieval. No study above validates this exact combined package, and every viewing session need not contain all six steps.

For example, an authored café scene could begin with a short English orientation: the learner wants a drink to take away. The server speaks; Spanish captions and English help are available. The learner may order, ask what is available, or ask for repetition. A later complication—an unavailable ingredient—creates a reason to clarify or choose an alternative. A recap offers one or two expressions to keep. Another day, the same useful request might appear at a food stand with a different speaker.

For a real-media version, a short creator clip could show a similar exchange. The owner watches freely, optionally checks a line, and selects an expression. A separate authored situation then asks how that expression would fit elsewhere. The player should make the boundary clear: the original speaker's words are source material; the new scenario and explanation are our teaching material. We would not imply that a source actor actually spoke a generated continuation.

### Three possible experiments and what each would teach us

These are discussion options, not a delivery sequence already chosen by the owner.

| Experiment | Bounded experience | What it would resolve | Main effort and uncertainty |
| --- | --- | --- | --- |
| Illustrated conversation | One short situation, two characters, a few decisions, recorded dialogue, temporary state | Whether participation and consequences make practice enjoyable; whether options feel meaningful | Dialogue quality, voice quality, branching feedback, phone pacing |
| Curated media companion | A few authorized/embeddable clips with prepared transcripts, replay and optional phrase saving | Whether real voices and personally interesting content justify the extra support tools | Transcript preparation, source reliability, selecting useful expressions |
| Media-to-scene bridge | One source moment followed by a newly authored related situation | Whether moving an expression into a different context feels useful | Designing a transfer task that is neither trivial nor too difficult |

An AI voice conversation would answer a fourth question—whether open production and responsive dialogue are worth their extra complexity. It is not a prerequisite for any of the three above. A full cross-site extension and arbitrary-media importer would each be larger independent projects, not routine additions to the media experiment.

### What can be shared without overbuilding

The reusable ideas are passage identity, original text, optional help, expression annotations, source attribution, replay where media exists, and an explicit notebook handoff. The existing lesson preview already provides some nearby help and choice/navigation behavior. Its optional investigation branches are not yet a general audiovisual dialogue engine; the relevant starting point is [LessonPlayer.jsx](../../src/features/lessons/LessonPlayer.jsx), with proposed integration in [INTEGRATION.md](../guided-lessons/INTEGRATION.md).

I would first establish a small shared passage/encounter contract through real examples, rather than build a universal learning platform. If both a scene and a curated clip need the same replay/help component, extraction becomes justified. If their interaction differs, keeping controllers separate avoids forcing a film into a conversation tree or a conversation into a timeline.

Notebook integration would need to preserve current meaning ownership and existing entry identity. A source sentence could become an example on a chosen meaning or an owner note through an explicit review step. Automatic word-bank behavior, inferred mastery, and automatic Repaso scheduling are separate product choices. The new experience should not create a second vocabulary notebook simply because a competitor has one.

The [current guided-lesson scope](../guided-lessons/SCOPE.md) already favors manageable Spanish, a brief English orientation, selected focus expressions, nearby help, and optional activities. Those choices are compatible with the research. This new conversation concept does not automatically replace the history series. Historical investigation choices and fictional conversational consequences serve different purposes, even if they share presentation tools.

### Choices that need to feel different

There are at least four useful kinds of decision:

1. **Meaning check:** identify what someone asked or what just happened. This can have an objectively supported answer.
2. **Personal intention:** choose tea, coffee, or nothing; several replies are valid and lead to coherent consequences.
3. **Conversational strategy:** ask for repetition, confirm a detail, or politely disagree. The chosen strategy should actually influence the reply.
4. **Language formulation:** decide how to express an intended meaning or try saying it without options. Feedback should distinguish grammar, meaning, and appropriateness.

Mixing all four into “correct/incorrect” would lose much of the concept's promise. A slightly unusual but understandable response might get a natural follow-up. A genuinely misleading phrase might lead to a repair opportunity. A valid regional variant should not be marked wrong merely because the script preferred a different one.

For manageable authoring, branches can rejoin after a meaningful local exchange. Remember only what later dialogue needs. Unlimited branching adds content to review; it does not guarantee a better learning experience. Likewise, a time limit should serve a deliberate practice goal, not be required merely to make the scene feel interactive.

### Tentative preferences informed by this research

- Start by deciding the desired experience: enjoying a situation, understanding natural speech, or practicing a response. Those can coexist, but one should lead each small experiment.
- For the first authored scene, prioritize natural Mexican Spanish, coherent choices, distinct voices, and useful help before full animation. Mexican Spanish is consistent with the existing content direction, not a requirement inferred from the comparative studies.
- Let support be available immediately, with an optional listen-first or say-first mode. Do not force a struggle before allowing English.
- Preserve stretches of story or viewing without exercises. Use practice when it adds something specific.
- Offer intentional capture of useful expressions with their source. Avoid turning every lookup into a permanent obligation.
- Treat authored scenarios and curated real media as compatible future directions, while keeping arbitrary importing and cross-site extensions separate in scope.
- Evaluate interest, comprehension, unaided production, and delayed transfer separately if and when the owner wants to test them. A small prototype can answer whether the experience is worth pursuing; it cannot establish general educational efficacy.

## 7. Follow-up inspection and open questions

### Most useful references to inspect next

| Reference | What to look for | Access/evidence status |
| --- | --- | --- |
| [Mi Vida Loca trailer](https://vimeo.com/93297787) and episode transcripts linked above | Being addressed as a participant; where instruction enters the story | Published trailer/transcripts; original Flash runtime not tested |
| [Duolingo Adventures demo](https://blog.duolingo.com/adventures/) | Purposeful choices, character reactions, spatial context | Original documented design; current Speaking Adventures needs account inspection |
| [H5P branching examples](https://h5p.org/branching-scenario) | How a decision changes the next segment; how branches end or rejoin | Public example pages and source inspected; interactive playback not tested |
| [Lingopie player help](https://help.lingopie.com/support/solutions/articles/150000076263-how-to-use-video-features-on-lingopie-) | Whether help interrupts watching; how a saved expression returns to its scene | Official documentation; paid/mobile session not tested |
| [Yabla tutorial player](https://english.yabla.com/player_cdn.php?id=14619&tlang_id=en) | Segment controls, captions hidden/revealed, dictation hints | Public tutorial documentation; full interaction not tested |
| [Lince methodology](https://getlince.app/methodology/) | The transition from watching to recall to a different situation | Explicit documented lesson sequence; installed app not tested |
| [Migaku card demo](https://migaku.com/blog/youtube/card-creation-from-video-content-migaku-browser-extension) | What context is preserved and what the user can edit | Official demonstration; extension not installed |
| [Memrise Stories](https://memrise-stories.replit.app) | Whether culturally situated stories offer a useful alternative to drills | Officially linked; research fetch failed; needs live inspection |

### A focused hands-on comparison

If account/browser access becomes available, inspect the same small set of tasks in selected products: find an appropriate Spanish clip; understand one unfamiliar phrase; replay it; hide/reveal help; save it; resume viewing; and revisit it later. For a scenario, add choosing a valid alternative, asking for help, recovering from an unsuitable reply, and restarting with different choices.

Record where each action is available, what context survives, how much navigation it requires, and whether the phone layout supports it. Check actual caption/audio agreement and regional language. Observe whether failed speech recognition is distinguishable from language feedback. Account progress and media availability can change the flow, so record those conditions rather than generalizing from one screen.

This would be a UX assessment, not a learning trial. A later optional learning check could ask for a response after a delay and in a changed situation. The owner has previously deferred formal reading-session evaluation; this research does not reinstate it as a requirement.

### What remains unsettled

- Which experience the owner most wants: practical situations, recurring fictional characters, substantial topic exploration, personally selected media, or a combination.
- How much spoken production is desirable, including a quiet-use alternative and whether any recording should be retained.
- How frequently choices should appear before they interrupt the story.
- Whether help should be visible initially or simply easy to reveal; this may differ by session and content.
- Whether real-media work begins with a curated set, creator-provided material, or owner-supplied text and timestamps.
- The exact source, transcript, licensing, and offline arrangement for any actual media selected.
- Current paid-app flow details, proprietary recognition/scoring systems, and product-specific long-term transfer claims not established by the available evidence.

The missing hands-on access does not prevent these architectural and learning conclusions. It does limit judgments about current interaction quality, exact phone behavior, and which implementation feels best to the owner. Those are the highest-value gaps to close before choosing a detailed design.
