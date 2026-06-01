# Book Hub Refactor Map

## Current Page Purpose

`app/(protected)/books/[userBookId]/page.tsx` is the main Book Hub for one private `user_books` row.

It lets the user:
* view shared/global book metadata from `books`
* view and update private book status, reading dates, format/progress settings, reading sessions, notes, reflection, reader-fit ratings, reader advice, favorite quotes, and memorable words
* navigate to Curiosity Reading, Read Along, Just Reading, Listening, Study, Vocab List, and Book Stats
* view and manage story notes: characters, chapter summaries, settings, and cultural notes
* view and edit shared/global Book Info only when the current user is a super teacher
* flag a book for teacher/super-teacher review
* remove the current user's own `user_books` row from their library
* manage kanji enrichment rows for saved vocabulary

The page displays and edits both layers of data:
* Student/private ownership data: `user_books`, reading sessions, saved vocabulary links, story notes, private reflections, private progress/status, and user-library actions.
* Shared/global metadata: `books`, contributor display fields, publisher, ISBN, cover, book type, page count, links, and related shared people/publisher records. This layer must remain super-teacher-only for editing.

## Current Inventory

### Types

Page-local types currently include:
* `Book`
* `UserBook`
* `LookupRow`
* `ReadingSession`
* `HubTab`
* `EditingPanel`
* `VocabTab`
* `ProfileRole`
* `Character`
* `ChapterSummary`
* `SettingItem`
* `CulturalItem`
* `KanjiMapRow`
* `VocabCacheQueueRow`
* `CommunityGenreRow`
* `CommunityContentNoteRow`
* `SavedKanjiReading`
* `SessionKanjiReading`

Do not move these in the first visual pass. Several are used across page state, save handlers, and existing extracted components.

### Constants

Page-local constants include:
* `BOOK_TYPE_OPTIONS`
* `GENRE_OPTIONS`
* `DIFFICULTY_OPTIONS`

These are safe to pass into components, but should stay in `page.tsx` until the visual pass shows which contracts are stable.

### Helper Functions

General helpers:
* `hasKanji`
* `generateVocabularyKanjiMap`
* `safeDate`
* `formatYmd`
* `linksToText`
* `parseLinks`
* `displayLinkLabel`
* `displayLinkUrl`
* `clampRating5`
* `formatRating`
* `stars5`
* `ratingDescription`
* `entertainmentRatingText`
* `languageLearningRatingText`
* `formatTypeLabel`
* `bookTypeLabel`
* `isDuplicateBookIsbnError`
* `progressModeLabel`
* `formatMinutes`
* `formatTimer`
* `pageToPercent`
* `percentToPage`
* `genreLabel`
* `parseCommunityTags`
* `dedupeCommunityTags`
* `joinCommunityTags`
* `hiraToKata`
* `normalizeKanjiQueueKey`
* `isSuperTeacherFlag`

Page-local UI helper components at the bottom:
* `FilingTab`
* `Detail`
* `DateField`
* `StarRatingField`
* `DifficultyField`
* `PersonRow`

Keep all helpers in `page.tsx` for the first pass unless they are moved only as part of a presentational component extraction and behavior stays identical.

### State

Major state groups:
* Load/access state: `loading`, `row`, `error`, `userId`, `myRole`, `isSuperTeacher`, `isLinkedStudentToAnyTeacher`, `profileLevel`, `bookHubOwnerName`.
* Modals/actions: `showBookFlagModal`, `bookFlagNote`, `isSavingBookFlag`, `showRemoveLibraryConfirm`, `isRemovingFromLibrary`, `removeLibraryError`.
* Editing state: `editingTab`, `saving`, `activeTab`, tab-specific editing booleans derived from `editingTab`.
* Private reading/reflection state: `startedAt`, `finishedAt`, `dnfAt`, `notes`, `myReview`, `readerAdvice`, ratings, `readerLevel`, `recommendedLevel`, `favoriteQuotes`, `memorableWords`, `formatType`, `progressMode`, `showPageNumbers`.
* Shared book metadata state: `bookType`, `publishedDate`, `pageCount`, `seriesNumber`, `isbn`, `isbn13`, cover and contributor fields, selected shared person/publisher ids, required shared record flags, `linksText`.
* Community signal state: `genre`, `triggerWarnings`, saved/shared genre and content-note data.
* Reading-session state: `readingSessions`, `showAllSessions`, session form fields, timer state, editing session id.
* Story-note state: character/chapter/setting/cultural arrays, show/reverse/editing/saving/saved ids.
* Kanji enrichment state: saved defaults, queue, loading/error, open word ids, editing rows, saving word id.
* Old/possibly unused saved-word state: `vocabTab`, `quickWord`, `quickLoading`, `quickError`, `quickPreview`, `quickSessionWords`, `editingQuickSessionId`, `editingQuickSessionWord`, default vocab page/chapter fields, `hideKanjiInReadingSupport`, `quickWordInputRef`.
* Word Explorer state: `showWordExplorer`, `wordExplorerQuery`, `wordExplorerLoading`, `wordExplorerError`, `wordExplorerResults`.

Keep state in `page.tsx` during the first visual pass.

### Data Loading

Primary load/data functions:
* `load`
* `loadUniqueLookupCount`
* `loadCommunityContributions`
* `loadReadingSessions`
* `loadCharacters`
* `loadChapterSummaries`
* `loadSavedKanjiDefaults`
* `loadKanjiMapQueue`
* `loadBookOptions` inside an effect
* `hydrateLinkedPeopleAndPublisher`

The main `load` function currently handles auth, profile role, access checks, `user_books` plus joined `books`, owner profile display, teacher link checks, state hydration, community contributions, lookup counts, reading sessions, story notes, and saved kanji defaults.

Do not move data loading in the visual pass.

### Access / Ownership Checks

Access checks currently include:
* signed-in session requirement
* profile role and `is_super_teacher` loading
* owner access: `r.user_id === user.id`
* super-teacher access
* linked-teacher access through `teacher_students`
* linked-student detection for teacher-facing context
* Book Info edit permission: `canEditBookInfo = isSuperTeacher`
* shared Book Info save guard in `saveAll`
* remove-from-library owner guard before calling `/api/books/[userBookId]/remove-from-library`

Do not move access/security logic in the first pass.

### Derived / Calculated Values

Derived values include:
* edit booleans: `isEditingThisTab`, `canEditThisTab`, `isBookInfoEditingTab`, `isEditingBookInfoDetails`, `isEditingBookInfoPeople`, `isEditingBookInfoLinks`, `isEditingBookInfoCopy`, `isEditingCommunityGenres`, `isEditingCommunityContentNotes`, `isEditingReflection`
* date objects: `started`, `finished`
* reading-session summaries: `realReadingSessions`, `daysRead`, `coverageReadingSessions`, `earliestTrackedStartPage`, `furthestTrackedPage`, `visualReadingSessions`, `pageTrackedReadingSessions`, `timedSessions`, `timedPageTrackedSessions`, `totalPagesRead`, `totalTimedMinutes`, `totalTimedPages`, `averageMinutesPerPage`, `furthestPage`, `progressPercent`, `lastReadDate`, `visibleReadingSessions`
* filler-page action booleans: `canFillBeginningPages`, `canFillEndingPages`
* story-note ordering: `visibleSettingItems`, `visibleCharacters`, `visibleCulturalItems`, `visibleChapterSummaries`
* session groups/minutes/pages: curiosity/fluid/listening session groupings and minute/page stats
* render-time book option groups: `currentlyReadingBooks`, `otherBooks`
* render-time flags: `isViewingStudentBookHub`, `canRemoveFromMyLibrary`, `bookHubContextLabel`
* link display array: `relatedLinksArr`

Keep calculations in `page.tsx` during visual extraction. Pass already-computed values into components.

### Event Handlers / Actions

Major handlers/actions include:
* status and reading-date actions: `saveReadingDates`, `saveBookStatusDates`, `markStartedToday`, `markFinishedToday`, `markDnfToday`, `openReadingReflection`
* reading sessions: `startEditingReadingSession`, `cancelEditingReadingSession`, `saveReadingSession`, `deleteReadingSession`, `fillBeginningPages`, `fillEndingPages`
* story notes: add/update/start-edit/stop-edit/save/delete handlers for characters, chapters, settings, and cultural items
* reflection and community: `saveReadingReflectionFields`, `saveCommunityContributions`
* shared Book Info and people/publisher: `saveAll`, `upsertPublisherRecord`, `ensureStrictPublisherRecord`, `upsertPersonRecord`, `ensureStrictPersonRecord`, `syncContributorRole`
* kanji enrichment: `saveKanjiWord`, `buildPreparedKanjiRows`, `loadKanjiMapQueue`, `handleWorkOnKanjiWord`, `removeWordFromKanjiEnrichment`, `updateKanjiMapRow`, `setKanjiWordOpen`, `upsertKanjiQueueWord`
* book review/removal: `flagBookForTeacherReview`, `removeFromMyLibrary`
* old/possibly unused saved-word flow: `pullQuickWord`, `saveQuickWord`, `startEditingQuickSessionWord`, `cancelEditingQuickSessionWord`, `saveEditedQuickSessionWord`
* word explorer: `openWordExplorer`, `searchWordExplorer`
* misc: `cancelEdits`, `confirmLeaveIfTimerActive`, `renderSessionToggle`

Do not move handlers in the first pass.

### Old Or Possibly Unused Flows

There appears to be an older saved-word/add-word flow still present in `page.tsx`:
* state: `quickWord`, `quickLoading`, `quickError`, `quickPreview`, `quickSessionWords`, `editingQuickSessionId`, `editingQuickSessionWord`, default vocab page/chapter fields, `hideKanjiInReadingSupport`, and `quickWordInputRef`
* handlers: `pullQuickWord`, `saveQuickWord`, `startEditingQuickSessionWord`, `cancelEditingQuickSessionWord`, `saveEditedQuickSessionWord`
* behavior: calls `/api/jisho`, looks up or inserts `vocabulary_cache`, inserts `user_book_words`, optionally generates a vocabulary kanji map, and updates quick session display state

Important: this flow should not be deleted in the visual pass. It touches saved vocabulary, vocabulary cache, kanji-map generation, and user-book word inserts. First verify whether it is still reachable through an extracted component, hidden branch, or older UI route. If it is truly unused, remove it only in a later cleanup with a focused test plan.

The Word Explorer modal is still rendered behind `showWordExplorer`, but there does not appear to be an obvious visible trigger in the current Book Hub render. Treat that as possibly dormant until verified manually.

### Render Sections

Major render sections in `page.tsx`:
* loading state
* access denied / missing book state
* `BookFlagModal`
* remove-from-library confirmation modal
* main hero/book context area with cover, title, author/translator, teacher context, and switch-book select
* Book Status panel with status dates, status buttons, reflection prompt, filler-page buttons, and Remove from My Library
* optional `TeacherPrepAssignBox`
* progress summary and progress bar
* snapshot stat cards
* action grid through `BookHubActionGrid`
* filing/tab navigation
* `BookInfoTab`
* `VocabTab`
* `ReadingTab`
* `StoryTab`
* `RatingTab`
* Word Explorer modal

## Current Risks / Do Not Touch Yet

Do not move or change these in the first pass:
* auth/session loading
* owner, linked-teacher, and super-teacher access checks
* `canEditBookInfo` and shared `books` table save restrictions
* `user_books` private update behavior
* `books` shared/global update behavior
* person/publisher record creation/linking behavior
* `book_contributors` sync behavior
* community genre/content-note saves
* reading-session insert/update/delete behavior
* timer and before-unload behavior
* filler-page creation behavior
* remove-from-library API behavior
* teacher review flag behavior
* story-note CRUD behavior
* kanji enrichment queue, exact-cache relinking, and kanji-map row behavior
* old quick saved-word/add-word flow until it is proven unused
* word explorer behavior until it is proven unused
* all controlled form state and save handlers

## First Pass: Visual / Page-Thinning Components

### K. `BookHubTabPanels`

* What JSX it owns: high-level conditional render blocks for `BookInfoTab`, `VocabTab`, `ReadingTab`, `StoryTab`, and `RatingTab`.
* Expected props: many existing state values, setters, helpers, and handlers.
* What stays in `page.tsx`: all state, calculations, handlers, data loading, access checks, helper functions.
* Layer: presentational UI, but with very large prop surface.
* Risk level: high for the first pass.
* Why it is safe or risky: it could reduce line count, but the prop list would be huge and could make ownership boundaries harder to understand.
* Recommended order: later in visual pass only after smaller pieces are extracted.
* Helpful comment notes: if done, comment that this is composition-only and all logic remains in `page.tsx`.

## Later Architecture Refactor

### Access And Ownership

* Possible file/layer: `controller.ts`, `service.ts`, `dao.ts`.
* What logic might move later: signed-in user loading, profile role loading, owner/super-teacher/linked-teacher access checks, owner profile display loading.
* Why it should wait: this is security-sensitive and currently controls which private user-book data can be viewed.
* Risks to check before moving it: student privacy, teacher-student links, super-teacher behavior, and using the book owner id for private data.

### Shared Book Metadata Save Flow

* Possible file/layer: `controller.ts`, `service.ts`, `dao.ts`.
* What logic might move later: shared `books` update payload creation, ISBN duplicate retry, person/publisher strict record checks, contributor sync, save notice shaping.
* Why it should wait: it edits shared/global metadata and has super-teacher-only permission requirements.
* Risks to check before moving it: normal users must not edit `books`; RLS/API strategy should be verified; contributor links must not be half-saved.

### Private User Book Save Flow

* Possible file/layer: `controller.ts` and `service.ts`.
* What logic might move later: reading reflection save, reading dates/status save, `user_books` private settings save, reader level fallback to profile level.
* Why it should wait: user-private fields are interleaved with shared Book Info in `saveAll`.
* Risks to check before moving it: preserving private/shared distinction, profile-level fallback, community rating visibility, and existing saved data compatibility.

### Reading Sessions And Timer

* Possible file/layer: `controller.ts`, `service.ts`, `dao.ts`.
* What logic might move later: timer transitions, before-unload confirmation, reading session insert/update/delete, filler-page insertion, progress calculations.
* Why it should wait: timer/session behavior is easy to regress.
* Risks to check before moving it: editing existing sessions, filler rows, page vs listening modes, progress calculations, and redirect confirmation.

### Story Notes

* Possible file/layer: `controller.ts`, `service.ts`, `dao.ts`, `types.ts`.
* What logic might move later: character/chapter/setting/cultural CRUD and ordering/editing state.
* Why it should wait: a visual pass can first keep these in `StoryTab` props.
* Risks to check before moving it: temp ids for unsaved rows, sort order, saved/editing badges, and delete confirmation behavior.

### Kanji Enrichment

* Possible file/layer: `service.ts`, `dao.ts`, `controller.ts`.
* What logic might move later: saved kanji defaults, queue loading, exact cache-row creation/relinking, map-row preparation, auto-fill from exact matches.
* Why it should wait: this is complex vocabulary/cache logic and has been actively debugged.
* Risks to check before moving it: saved word surface vs cache surface, one row per kanji, queue disappearance, exact-match donor behavior, and cache linking.

### Old Saved-Word / Quick Add Flow Cleanup

* Possible file/layer: focused cleanup task before architecture movement.
* What logic might move later: `quickWord`, `quickPreview`, `quickSessionWords`, quick edit state, `pullQuickWord`, `saveQuickWord`, and edited quick-session word handlers.
* Why it should wait: first verify whether the flow is truly unused or still reachable through hidden UI.
* Risks to check before moving/removing it: `user_book_words` inserts, `vocabulary_cache` inserts, kanji-map generation, manual meaning behavior, and add-word/curiosity-reading parity.

### Word Explorer

* Possible file/layer: component plus service later.
* What logic might move later: modal UI, `/api/jisho` search, result shaping.
* Why it should wait: it appears rendered but may not have an obvious trigger.
* Risks to check before moving it: whether it should remain, be removed, or be reintroduced as a supported feature.

### Types

* Possible file/layer: `types.ts`.
* What logic might move later: page row types, story-note types, kanji-map types, tab/editing union types, component prop types.
* Why it should wait: types should follow stable component/service boundaries, not lead them.
* Risks to check before moving it: avoiding overly broad shared types that freeze unstable page internals.

### DAO / Repository Organization

* Possible file/layer: `dao.ts` or `repository.ts`.
* What logic might move later: Supabase reads/writes for `user_books`, `books`, `profiles`, `teacher_students`, `user_book_reading_sessions`, story-note tables, community tables, people/publisher tables, `book_contributors`, `user_alerts`, `user_book_words`, `vocabulary_cache`, and kanji-map tables.
* Why it should wait: moving queries before visual thinning would make regressions harder to isolate.
* Risks to check before moving it: RLS, owner id, partial saves, row shapes, joined table response shapes, and route/auth assumptions.

## Suggested Status Labels

Use these labels for this page:
* Not started
* Visual pass in progress
* Visual pass mostly done
* Visual pass done / architecture deferred
* Architecture pass later
* Architecture pass in progress
* Architecture pass done

Recommended current status: `Not started`.

When all safe presentational extractions are complete, use `Visual pass done / architecture deferred`. That means page thinning is complete and deeper controller/service/DAO/helper cleanup is intentionally saved for later.

## Finished

- [✔️] Extracted `BookHubLoadingState`.
- [✔️] Extracted `RemoveFromLibraryDialog`.
- [✔️] Extracted `BookHubProgressSummary`.
- [✔️] Extracted `BookHubStatCard`.
- [✔️] Extracted `BookHubNotices`.
- [✔️] Extracted `BookHubTabBar`.
- [✔️] Extracted `BookHubTabSectionHeader`.
- [✔️] Extracted `BookHubHero`.
- [✔️] Extracted `BookHubStatusPanel`.
- [✔️] Extracted `WordExplorerModal`.
- [✔️] Extracted 