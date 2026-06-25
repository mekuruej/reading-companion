# Architecture-Heavy Refactor Map

## How to use this doc

This is a working refactor map, not an archive.

These pages were parked after the visual-component extraction pass because they are not mainly large from inline JSX. They are large because they contain sensitive page-level architecture:

* data loading
* Supabase queries
* access checks
* save/update/delete workflows
* study progression logic
* queue/review state
* timers
* cross-tab state
* derived calculations
* parent-controller behavior

When a page reaches a safe stopping point, update its section with what was done and what should happen next. Delete a section only when the page no longer needs architecture-level planning.

---

## Refactor Rule

For this phase, do **not** start by randomly extracting JSX.

For each page, map the architecture first:

* major domains
* state groups
* load functions
* save/mutation functions
* render branches
* access gates
* sensitive workflows
* safe first extraction target
* things not to touch yet

Good architecture-heavy refactor targets:

* domain hooks
* controller hooks
* isolated helper functions
* smaller tab/section components
* reusable form/search panels
* reducer-style state cleanup
* typed data mappers
* repeated Supabase query helpers
* clearly separated load/save workflows

Avoid first-pass changes to:

* access logic
* RLS-sensitive assumptions
* save/delete behavior
* study answer progression
* timer behavior
* kanji queue status rules
* teacher/student authorization
* bulk update/order workflows

---

# Current Architecture-Heavy Targets

## `app/(protected)/books/[userBookId]/page.tsx` + Book Hub tab components

**Current lines:** about 5582 for the main page.

**Current status:** Architecture-heavy. Do not treat as a visual-only cleanup.

**Main problem:**
`page.tsx` is acting as the Book Hub controller for many separate domains:

* Book Info
* Reading sessions
* reading timers
* progress calculations
* Story Notes
* Rating / Reading Reflection
* Vocabulary tools
* quick word saving
* Word Explorer
* kanji enrichment queue
* book status dates
* DNF / finished workflows
* contributor and publisher syncing

**Important finding:**
The render is already partially componentized. The biggest remaining issue is not inline JSX in `page.tsx`; it is that `page.tsx` owns too much state and too many save/load handlers.

### First subtarget: `components/tabs/BookInfoTab.tsx`

**Starting lines:** 1639
**Current lines after first pass:** 1254
**Status:** Good stopping point reached.

**What was done:**

Extracted:

* `BookInfoDetailsSection.tsx`
* `BookInfoLinksSection.tsx`
* `BookInfoRecordSearchPanel.tsx`

Reused `BookInfoRecordSearchPanel` for:

* author
* translator
* illustrator
* publisher

**Remaining issue:**
`BookInfoTab.tsx` is smaller now, but it still mixes:

* contributor/person search state
* Supabase person/publisher searches
* author book-match logic
* selected person/publisher linking
* “create new shared record” behavior
* parent-provided save/edit state

**Next recommended action:**
Do not continue extracting randomly. Next pass should map whether person/publisher search logic can move into a dedicated hook, such as:

* `useBookInfoPersonSearch`
* `useBookInfoPublisherSearch`
* `useBookInfoContributorMatching`

### Later Book Hub page plan

Only after `BookInfoTab.tsx` stays stable, return to the main Book Hub page and consider domain controller hooks such as:

* `useBookHubReading`
* `useBookHubStoryNotes`
* `useBookHubBookInfo`
* `useBookHubQuickVocab`
* `useBookHubKanjiQueue`
* `useBookHubStatusDates`
* `useBookHubReflection`

**Do not do first:**

* Do not move Supabase saves out of `page.tsx` without a map.
* Do not move Book Hub access checks yet.
* Do not split the main page render before the tab/controller boundaries are clearer.
* Do not touch kanji enrichment until it has its own map.

---

## `app/(protected)/library-study/check/page.tsx`

**Current lines:** about 3484

**Reason parked:**
Ability Check has study logic, review branches, answer-flow complexity, and likely multiple overlapping modes.

**Main risk:**
Small changes can accidentally alter answer progression, review behavior, daily check behavior, typed-answer handling, or study event logging.

**Next action:**
Create a study-flow map before extracting more.

Map:

* answer state
* current card/current prompt state
* reveal state
* typed answer state
* multiple-choice state
* daily/review mode branches
* completion state
* event logging
* keyboard handlers
* skip/next behavior

**Safe first refactor type:**
Only after mapping, extract clearly isolated UI such as instructions, status banners, or result panels if they do not affect progression logic.

**Do not do first:**

* Do not move answer-checking logic yet.
* Do not change event logging.
* Do not merge daily/review branches until their behavior is documented.
* Do not “simplify” progression state without tests/manual verification.

---

## `app/(protected)/teacher/library/[teacherBookId]/page.tsx`

**Current lines:** about 1601

**Reason parked:**
Teacher prep editor/order/save behavior is sensitive.

**Main risk:**
This page likely mixes teacher prep item editing, ordering, saved item rows, definition checks, and teacher-facing review workflows.

**Next action:**
Map the save/order/update behavior before extracting more.

Map:

* teacher book load
* prep item list
* item editing state
* order/reorder behavior
* save/delete handlers
* definition-check logic
* any linked student/book permissions
* teacher-only assumptions

**Possible safe extraction targets after mapping:**

* saved item table
* saved item row
* row detail panel
* definition-check card
* empty/loading/error states

**Do not do first:**

* Do not change ordering behavior.
* Do not move save/delete handlers before mapping.
* Do not alter teacher authorization assumptions.
* Do not combine prep item types unless their behavior is clearly identical.

---

## `app/(protected)/teacher/kanji/page.tsx`

**Current lines:** about 1601

**Reason parked:**
Kanji queue counting, reports, flags, statuses, and alerts need clearer definitions first.

**Main risk:**
Queue status labels and report resolution behavior are easy to break because they affect what teachers see and what disappears after resolution.

**Next action:**
Create a queue-state map before broad cleanup.

Map:

* queue status labels
* flagged/reported states
* missing cache states
* missing row/position states
* incomplete row states
* complete/excluded states
* teacher actions
* resolve behavior
* alert/banner behavior
* count calculations

**Possible safe extraction targets after mapping:**

* queue status badge
* filter panel
* alert panel
* kanji row card
* report detail panel
* empty/loading/error states

**Do not do first:**

* Do not alter status definitions.
* Do not change report resolution logic.
* Do not change what disappears from the queue.
* Do not change counts until the count definitions are documented.

---

# Completion Rule

The architecture-heavy refactor phase is complete when:

1. Each parked page has a domain map.
2. Sensitive workflows are documented before edits.
3. Large files are reduced by moving coherent domains, not by random JSX extraction.
4. Access checks and save/mutation behavior remain unchanged unless intentionally refactored.
5. Each major refactor has a clear stopping point and passes `npx tsc --noEmit`.
6. The remaining large files are large for acceptable reasons, or have their next refactor map ready.
