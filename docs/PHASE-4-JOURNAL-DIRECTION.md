# Phase 4p–4s — Diario workspace

**Approved 2026-08-03; complete and locally closeout-verified through 4s.** This direction records the journal outcome agreed with the owner before
implementation. It is a focused workspace over the existing data model, not a richer stored page
profile and not a third personal-content type.

## Desired outcome

Diario should make short, dated reflection feel like its own habit rather than page maintenance:
fast to begin, calm to write, pleasant to reread, and naturally connected to the Spanish vocabulary
and other moments that matter. Cuaderno remains the place for durable notes and Collections.

Success means the owner can:

- reach today's writing in one tap and add more than one moment on the same day;
- write without a manual Save step or a blank record appearing merely from opening the editor;
- browse a chronological journal, deliberately search its title/body/tags, and revisit a nearby
  memory from a prior year;
- reread an entry without editing controls dominating the page;
- connect personal words and phrases, other pages, media and a separate reflection when useful;
- move an entry back to ordinary Pages without copying or converting data.

## Architecture boundary

- Schema stays at v3. A journal entry remains a dated General page. A dated Collection remains a
  Collection, and clearing a journal's date moves that same page back to Cuaderno.
- Existing page fields remain the complete stored shape: optional title, body, required journal
  date, tags, media links and `linkedKeys[]`. Prompts and navigation state are session-only.
- The event log remains authoritative. A new entry writes its existing `create` event only during
  its creation visit. An existing entry's autosave visit writes at most one `edit` event. Linking,
  prompt selection and navigation write no events.
- No journal count, streak, completion state, mood, weather, prompt ID, pin, new relationship type,
  direct Collection conversion or scheduled journal review is introduced.

## Delivery slices

### 4p — domain and navigation foundation

- Add Diario as a fourth tab between Cuaderno and Repaso.
- Hide journals from ordinary Cuaderno browsing and page-profile controls, while retaining them in
  intentional global search.
- Exclude journals from the header's page count and remove journal creation from the General-page
  flow; new entries begin in Diario.
- Use one session route trail across tabs so linked navigation and Back preserve the actual origin.

### 4q — home, retrieval and memory

- Today opens the earliest-created entry for the local day, or a nonmaterialized draft if none
  exists. New moment always starts another same-day draft. Continue offers the most recently
  touched entry when it is not the Today anchor.
- Show a newest-first timeline for the current year, an explicit archive for earlier years, and
  journal-only search over title, body and tags. An empty journal search never logs `search_miss`.
- A memory is the entry closest to today's month/day within ±7 calendar days in the most recent
  prior year that has a candidate.

### 4r — focused editor and prompts

- Date is required, title is optional, and body is the primary writing surface.
- Autosave is debounced and visible. A fresh draft materializes only after its body becomes
  nonblank; changing only its title or opening and leaving creates nothing.
- Supply 24 optional prompts. The selected prompt is local to the editor and is not stored as
  metadata or automatically copied into the entry.

### 4s — reading and connections

- A clean reader leads with date, optional title and body, then linked personal vocabulary and
  related journal moments.
- Reflection always creates a separate same-day moment linked to the entry being reflected on.
- Más contains tags, media, nonjournal page relations, activity, tricky state, delete, and Move to
  Pages. Its vocabulary picker is limited to personal words and phrases.

## Verification

Each slice receives focused pure/component/integration coverage and a production build. At closeout,
run the complete serial suite and verify a seeded 375×812 browser flow, including no horizontal
overflow and the cross-tab Back path. The owner's real browser data is never used for testing.
