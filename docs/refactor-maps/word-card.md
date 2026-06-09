Current size: 884 lines.

Word Detail Page Refactor / Status Map
Current Page Purpose

This page is the single saved-word detail page for a specific book word.

It lets an authorized user:

view dictionary-style details for one saved word
return to the Book Hub or Vocab List
see the word’s reading, JLPT/common status, and selected definition
see kanji metadata and related kanji words
see how often the word appears in the current book and across the user’s library
see saved instances of the same word across the user’s books
let teachers add/delete collocations for this word
let non-teachers flag that something seems off, currently via a simple alert
Current Risks / Do Not Touch Yet

For the first visual pass, do not move:

access checks
ownership checks
linked-teacher checks
Supabase queries
loadAll
loadBookAwareInfo
loadDictionaryExtras
collocation save/delete logic
API calls to kanjiapi.dev or /api/jisho
helper functions
services, DAOs, controllers, hooks, or page-local types

This page is small enough that we should extract only obvious visual sections.

Current Structure Map
1. Types

Keep in page.tsx for the first pass.

WordRow
SeenInstance
CollocationRow
KanjiMeta
RelatedWord
KanjiGroup
2. Constants

No major top-level constants besides inline route strings and labels.

Possible future constants, but not first pass:

default role
repeated route paths
section labels
“teacher/member/student/super_teacher” role values
3. Helper Functions

Keep in page.tsx for now.

asStringArray
normalizeJlpt
chapterDisplay
normalizeCollocation
getUniqueKanji

These are all tied to page display/data shaping and are not worth moving during the visual pass.

4. Existing Page-Local Component

CollocationsPanel already exists inside this file.

It owns:

collocation list UI
collocation input/note fields
add/delete buttons
its own local state
its own Supabase load/add/delete behavior

Do not split this yet during the first pass. It is self-contained, but it contains real save/delete behavior, so leave it alone unless doing a later teacher-collocation cleanup pass.

5. State

Access/loading state:

loading
needsSignIn
errorMsg

Role/access context:

myRole
derived isTeacher
ownerUserId

Book context:

bookTitle
bookCover

Word data:

word
meaningChoices

Seen/count data:

repeatsInThisBook
seenInstances
totalLookupCount

Kanji/dictionary extras:

kanjiMeta
kanjiGroups
dictionaryLoading
6. Data Loading

loadAll() handles:

auth user loading
sign-in fallback
profile role loading
user_books lookup
ownership check
super-teacher check
linked-teacher check through teacher_students
book title/cover loading
word loading from user_book_words
meaning choice setup
error handling

Keep all of this in page.tsx.

7. Access / Ownership Checks

Current access behavior:

unauthenticated users get needsSignIn
the page loads user_books by userBookId
access allowed if:
current user owns the book
current user is super teacher
current user is a linked teacher for the book owner
otherwise errorMsg becomes "You do not have access to this word."
that specific error renders AccessDeniedMessage

Do not move this during visual thinning.

8. Dictionary / Kanji Behavior

loadDictionaryExtras(surface):

gets unique kanji from the word surface
fetches kanji metadata from kanjiapi.dev
fetches related words from /api/jisho
uses Supabase auth session token for /api/jisho
stores results in kanjiMeta and kanjiGroups

Do not move this yet. It has external/API behavior and should stay stable.

9. Seen / Count Behavior

loadBookAwareInfo(surface, userId):

counts repeats in the current book
loads all matching saved word instances across the owner/user’s books
normalizes joined book data into SeenInstance
sets total lookup count from normalized seen instances

Keep this in page.tsx.

10. Collocation Behavior

CollocationsPanel:

loads rows from user_word_collocations
inserts new collocations
deletes collocations
requires auth user
is only shown when isTeacher

This is already separated visually, but it contains its own data logic. Defer further extraction.

11. Derived Values

Derived during render:

jlpt = normalizeJlpt(word.jlpt)
chapter = chapterDisplay(word.chapter_number, word.chapter_name)
isTeacher = myRole === "teacher"
per-seen-instance defIndex

Keep these in page.tsx for now.

12. Event Handlers

UI handlers include:

route to Book Hub
route to Vocab List
router.back
refresh with loadAll
non-teacher “Something seems off?” alert
teacher collocation load/add/delete inside CollocationsPanel

Keep handlers in page.tsx.

Render Sections

Top-level branches:

loading state
sign-in required state
error/no-word state
access denied state
main word detail page

Main render sections:

page header / book context nav
dictionary info card
kanji info subsection
words using these kanji subsection
seen-in section
repeated-count cards
seen-instance list
useful phrases / collocations section
non-teacher “Something seems off?” link
footer action buttons: Back / Refresh
Recommended First-Pass Visual Extractions
1. WordDetailLoadingState

Owns:

loading-state JSX

Stays in page.tsx:

loading branch decision

Expected props:

optional message

Category:

presentational UI

Risk:

very low

Suggested order:

1
2. WordDetailNeedsSignInState

Owns:

sign-in required message
Back to Books button

Stays in page.tsx:

needsSignIn branch decision
router callback

Expected props:

onBackToBooks

Category:

presentational UI

Risk:

very low

Suggested order:

2
3. WordDetailErrorState

Owns:

non-access-denied error / word-not-found UI
Back button

Stays in page.tsx:

error branch decision
special AccessDeniedMessage branch
router callback

Expected props:

message
onBack

Category:

presentational UI

Risk:

very low

Suggested order:

3
4. WordDetailHeader

Owns:

book cover/title/chapter/page header card
Vocab List button
Book Hub button

Stays in page.tsx:

bookTitle
bookCover
chapter
word.page_number
routing callbacks

Expected props:

bookTitle
bookCover
chapter
pageNumber
onOpenBookHub
onOpenVocabList

Category:

presentational UI

Risk:

low

Suggested order:

4
5. WordDictionaryInfoSection

Owns:

outer “Dictionary Info” section
word surface
reading
JLPT/common badges
can include slots or props for kanji/related sections

Stays in page.tsx:

jlpt derivation
word object
dictionaryLoading
kanjiMeta
kanjiGroups

Expected props:

surface
reading
jlpt
isCommon
children or separate slots for kanji panels

Category:

presentational UI

Risk:

low-medium

Suggested order:

5
6. WordKanjiInfoPanel

Owns:

“Kanji Info” subsection
loading state
no-kanji message
kanji pill list

Stays in page.tsx:

dictionaryLoading
kanjiMeta state/data loading

Expected props:

loading
kanjiMeta

Category:

presentational UI

Risk:

low

Suggested order:

6
7. RelatedKanjiWordsPanel

Owns:

“Words Using These Kanji” subsection
empty state
grouped related word display

Stays in page.tsx:

kanjiGroups state/data loading

Expected props:

kanjiGroups

Category:

presentational UI

Risk:

low

Suggested order:

7
8. WordSeenInSection

Owns:

“Seen In” section
repeats/lookup count cards
seen-in list wrapper

Stays in page.tsx:

count values
seenInstances
meaningChoices
chapterDisplay
defIndex calculation, unless passed precomputed later

Expected props:

repeatsInThisBook
totalLookupCount
seenInstances
meaningChoices

Category:

presentational UI

Risk:

low-medium

Suggested order:

8
9. WordDetailTeacherPhraseSection

Owns:

outer “Useful Phrases” section
descriptive copy
renders children slot for CollocationsPanel

Stays in page.tsx:

isTeacher decision
CollocationsPanel behavior

Expected props:

children

Category:

presentational UI

Risk:

low

Suggested order:

9
10. WordDetailReportIssueLink

Owns:

non-teacher “Something seems off?” link/button

Stays in page.tsx:

isTeacher branch
current alert behavior, unless callback passed

Expected props:

onReportIssue

Category:

presentational UI

Risk:

very low

Suggested order:

10
11. WordDetailFooterActions

Owns:

Back button
Refresh button

Stays in page.tsx:

router callback
loadAll callback

Expected props:

onBack
onRefresh

Category:

presentational UI

Risk:

very low

Suggested order:

11
Suspicious / Possibly Unused Code

Do not remove yet.

ownerUserId is stored and then used to load seen instances for the owner/user. This is probably intentional for linked teachers, but worth keeping an eye on.
isTeacher only checks myRole === "teacher", so super_teacher does not see CollocationsPanel unless role is literally "teacher". That may or may not be intended.
myRole state type includes "super_teacher", but setMyRole casts from profile.role, while super-teacher may sometimes be represented by is_super_teacher instead.
loadDictionaryExtras() fetches kanjiapi.dev directly from the client. That may be acceptable, but it is external network behavior inside the page.
loadDictionaryExtras() calls /api/jisho once per kanji character, which could be slow for longer words.
meaningChoices.findIndex((m) => m === item.meaning) may miss matches if meanings differ by whitespace/case.
The non-teacher “Something seems off?” button currently only shows an alert. It does not create a report.
CollocationsPanel is page-local but contains its own Supabase behavior; later it may deserve a separate file/component pass.

## Visual Pass Wrap-Up Audit

### 1. Visual Pass Status

Final status:

`Visual pass done / good stopping point`

The first visual pass has reached a good stopping point. The recommended low-risk presentational sections from the original map have been extracted:

* `WordDetailLoadingState`
* `WordDetailNeedsSignInState`
* `WordDetailErrorState`
* `WordDetailHeader`
* `WordDictionaryInfoSection`
* `WordKanjiInfoPanel`
* `RelatedKanjiWordsPanel`
* `WordSeenInSection`
* `WordDetailTeacherPhraseSection`
* `WordDetailReportIssueLink`
* `WordDetailFooterActions`

The remaining code is mostly access checks, Supabase loading, dictionary/kanji lookup behavior, seen-in/count behavior, and the teacher collocation workflow. The teacher collocation area is not a safe visual-only target because it contains its own load/add/delete behavior.

Updated tracker row:

`- [x] Visual pass done / good stopping point | app/(protected)/books/[userBookId]/words/[wordId]/page.tsx | 884 | 711 | -173 |`

### 2. Readability Check

The page is much easier to scan than before. The render now reads as a small set of named sections:

* header/navigation context
* dictionary/kanji information
* seen-in history
* teacher phrase/collocation area
* report issue link
* footer actions

The extracted components help readability because most repeated card/list markup is no longer inline in `page.tsx`.

The remaining page sections are understandable. The main area that still feels behavior-heavy is `CollocationsPanel`, but that is because it includes real teacher save/delete logic rather than purely visual JSX.

### 3. Remaining Code Classification

Remaining code is mostly in these buckets:

* access / ownership checks: auth user lookup, `user_books` lookup, owner check, super-teacher check, linked-teacher check.
* linked-teacher / super-teacher checks: access to another user’s saved word is guarded before the page data is shown.
* Supabase loading: profile, book context, saved word, seen instances, collocations inside `CollocationsPanel`.
* book/context loading: book title, cover, owner user ID, and route context.
* saved-word detail loading: selected `user_book_words` row and meaning choices.
* dictionary/kanji lookup behavior: `kanjiapi.dev` fetches and `/api/jisho` calls.
* seen-in/count behavior: repeats in the current book, total lookup count, and cross-book instances.
* teacher collocation behavior: local collocation state plus load/add/delete Supabase writes.
* report behavior: non-teacher report link currently shows an alert only.
* UI state: loading, sign-in needed, error message, dictionary loading, role, word/book data.
* derived values: normalized JLPT, chapter display, teacher role flag, meaning choice lookups.
* helper functions: string normalization, JLPT/chapter formatting, collocation normalization, unique kanji extraction.
* visual JSX still in `page.tsx`: page shell, high-level component composition, and `CollocationsPanel`.
* component composition: the render now mostly wires page-owned data into extracted visual components.
* legacy or suspicious code: `isTeacher` only checks `role === "teacher"`; super-teacher collocation access may need a deliberate product decision.

The remaining 711 lines are mostly behavior/data logic rather than easy visual JSX.

### 4. Visual Chunks Still Worth Extracting?

#### `CollocationsPanel`

What JSX it owns:

* teacher useful-phrases/collocations list
* collocation input fields
* add/delete buttons

Why it is safe or not safe:

* not safe as a first-pass visual-only extraction because it owns Supabase loading, insert, delete, local form state, and auth checks.

Risk level:

* Medium-high.

Do now or defer:

* Defer. Move only during a teacher-collocation behavior cleanup or second-pass component/controller split.

#### `WordDetailMainShell`

What JSX it owns:

* outer `main` and max-width wrapper.

Why it is safe:

* visual-only wrapper.

Risk level:

* Low.

Do now or defer:

* Defer. It would not meaningfully improve readability.

#### `WordDetailDictionaryExtras`

What JSX it owns:

* `WordKanjiInfoPanel` and `RelatedKanjiWordsPanel` inside `WordDictionaryInfoSection`.

Why it is not ideal:

* the current composition is already clear, and bundling the panels together would mainly hide useful structure.

Risk level:

* Low-medium.

Do now or defer:

* Defer.

### 5. Prop Basket / Over-Extraction Check

The extracted components do not appear too prop-heavy.

* Loading/error/sign-in states are small and clean.
* `WordDetailHeader` has a focused routing/context API.
* `WordDictionaryInfoSection`, `WordKanjiInfoPanel`, and `RelatedKanjiWordsPanel` split the dictionary area clearly.
* `WordSeenInSection` receives several display props, but it owns a real visual section and does not take over data loading.
* `WordDetailTeacherPhraseSection` is a good wrapper because it leaves `CollocationsPanel` behavior in place.

These components should stay page-local for now. Nothing needs to be promoted to shared components yet.

### 6. Behavior Boundary Check

The visual pass does not appear to move or blur:

* access checks
* owner/private book checks
* linked-teacher checks
* super-teacher access checks
* Supabase queries
* saved-word loading
* book context loading
* dictionary/kanji API behavior
* seen-in/count behavior
* teacher collocation load/add/delete behavior
* private saved-word data boundaries
* navigation to Book Hub / Vocab List / browser back

No suspicious behavior-boundary issue was found during this wrap-up audit. The only product question to revisit later is whether super-teachers should see the teacher collocation panel.

### 7. Architecture Deferred List

Keep these deferred for later:

* shared types: useful later, but not needed for the completed visual pass.
* helper functions: should move only with a clear feature-local utility/service destination.
* access helpers: this route uses owner, linked-teacher, and super-teacher checks; centralize with other private book routes later.
* services/DAOs/controllers: data loading is stable and should not move during visual cleanup.
* dictionary/kanji lookup service: external/API behavior should be extracted only with careful testing.
* seen-in/count helper: cross-book counting should remain page-owned until privacy/access helpers are centralized.
* collocation service/component split: needed later if teacher phrase workflows grow.
* report issue flow: current alert-only behavior needs product design before implementation.

### 8. Browser Smoke Test Suggestions

Suggested manual smoke test checklist:

* owner can open their own saved-word detail page.
* unauthorized user is blocked from another user's private saved-word detail page.
* linked teacher/super-teacher access still works if intended.
* word surface, reading, JLPT, and common badge display correctly.
* kanji metadata loads or shows an acceptable empty state.
* related kanji words load or show an acceptable empty state.
* seen-in counts and saved instances display correctly.
* Book Hub navigation works.
* Vocab List navigation works.
* browser back/footer back works.
* refresh action reloads the page data.
* teacher collocation add/delete works if visible.
* non-teacher report link still shows the current placeholder alert.
* mobile-ish check for header, dictionary card, seen-in section, and footer actions.

Do not run browser tests unless explicitly requested.

### 9. Final Recommendation

Stop visual thinning here.

The page has reached a good visual stopping point. Any next work should be second-pass architecture or behavior cleanup, especially around access helper centralization, dictionary lookup extraction, seen-in counting, teacher collocations, and the placeholder report flow.
