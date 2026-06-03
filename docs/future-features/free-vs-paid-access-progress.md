# Free vs. Paid Access Progress

This document tracks the gradual move from “trial users either have app access or lose access” toward a cleaner model:

* New users can join freely.
* New users get a full-access trial period.
* After the trial ends, they move to free access instead of being locked out of Mekuru completely.
* Vocabulary-saving and deeper study tools remain full-access features.

## Main access idea

Mekuru should eventually separate two questions:

1. Can this user enter the app?
2. Can this user use full-access learning features?

This is different from the old model, where expired access could block the user from the app completely.

## Free access should include

Free users should still be able to use reading-life tracking features.

Likely free features:

* Library / book tracking
* Book Hub index
* Book Info tab
* Reading Reflection tab
* Just Reading / timer-only reading
* Possibly Listening / timer-only listening
* Basic book-level stats snapshots
* A limited global stats area focused on reading-life connection, not saved vocabulary
* Find Your Next Book / Discovery, if it uses a safe shared signal source

Free users should not have vocabulary-saving capabilities.

## Full-access features should include

Full-access features are the deeper vocabulary, study, and saved-word tools.

Likely full-access features:

* Add Word
* Curiosity Reading
* Fluid Reading with saved-word support
* Vocabulary List
* Vocab Tools tab
* Story Notes tab
* Study Flashcards
* Ability Check
* Library Review / practice tools connected to saved vocabulary
* Book Flashcards if they use saved/private vocabulary
* Deeper saved-word stats and color progress

## Important privacy/security principle

Free/global/community discovery should not read directly from private `user_books` data across users.

Private tables such as `user_books`, `user_book_words`, private reading history, saved words, notes, and teacher/student data should remain private.

For shared ratings / Find Your Next Book, Mekuru should eventually use a limited shared signal source, such as:

* `book_reader_signals`
* `book_fit_signals`
* `public_book_reviews`

Possible safe public/shared fields:

* `book_id`
* `reader_level`
* `rating_difficulty`
* `rating_entertainment`
* `reader_advice`
* `created_at`

Do not expose:

* private saved vocabulary
* private reading sessions
* private notes
* full `user_books` rows
* teacher/student relationships
* user identity/profile data unless intentionally public

## Access helper direction

Access logic should live in `lib/access/`.

Current helper files:

* `lib/access/appAccess.ts`
* `lib/access/featureAccess.ts`
* `lib/access/requireFullAccess.ts`

The goal is to avoid scattering paid/free rules across every page.

Pages should ask simple questions like:

* Can this user access this book?
* Can this user use this feature?
* If not, show a friendly full-access message.

## Finished: first full-access gates

These pages now have first-pass full-access gates.

### Add Word

Path:

`app/(protected)/books/[userBookId]/add-word/page.tsx`

Finished:

* Keeps book access/ownership guard first.
* Adds full-access check after book access is confirmed.
* Adds save-time guard.
* Current full-access users/testers still keep access.

### Curiosity Reading

Path:

`app/(protected)/books/[userBookId]/curiosity-reading/page.tsx`

Finished:

* Keeps book access/ownership guard first.
* Adds full-access check after book access is confirmed.
* Adds save-word guard.
* Locked message points users toward Just Reading Timer.
* Current full-access users/testers still keep access.

### Vocabulary List

Path:

`app/(protected)/books/[userBookId]/words/page.tsx`

Finished:

* Keeps book access/ownership guard first.
* Adds full-access check before loading paid vocabulary data.
* Locked users should stop before loading `user_book_words`, global encounter counts, library progress, and learning settings.
* Current full-access users/testers still keep access.

### Study Flashcards

Path:

`app/(protected)/books/[userBookId]/study/page.tsx`

Finished:

* Keeps book access/ownership guard first.
* Adds full-access check before loading study/vocabulary card data.
* Adds guards to study write actions.
* Current full-access users/testers still keep access.

### Ability Check

Path:

`app/(protected)/library-study/check/page.tsx`

Finished:

* Adds profile access loading.
* Adds full-access check before loading saved vocabulary/study data.
* Adds locked full-access message.
* Adds guards to study/progress write actions.

Needs more testing:

* Build should pass.
* Functional card testing still needs test data because the current account may not have enough due Ability Check cards.
* Need to test:

  * Ready for Reading Gate
  * Not yet / Too hard for now
  * Typing checks
  * Meaning review
  * Flag card
  * Library Review links

## Not finished yet

These areas still need review and/or gates.

### Fluid Reading with saved-word support

Likely path:

`app/(protected)/books/[userBookId]/readalong/page.tsx`

Need to confirm whether this is the saved-word Fluid Reading page.

Expected behavior:

* Free users should be sent to Just Reading / timer-only reading instead.
* Full-access users should keep saved-word support.

### Vocab Tools tab

Need to identify location.

Expected behavior:

* Full-access only.

### Story Notes tab

Need to identify location.

Expected behavior:

* Full-access only.

### Library Review / Practice

Likely paths:

* `app/(protected)/library-study/practice/page.tsx`
* possibly connected routes under `/library-study`

Need to decide if all saved-vocabulary review tools are full-access.

### Book Flashcards

Likely path:

`app/(protected)/library-study/book-flashcards/page.tsx`

Need to confirm whether it uses saved/private vocabulary.

If yes, full-access only.

### Header/index pages and free-user demos

Need to decide how free users see indexes and study-tool entry points.

Current principle:

Free users should not be sent through normal chooser/index pages that only lead to locked private-data pages. That can feel like a tease or a dead end.

Better pattern:

* Full-access users see the real index/tool.
* Free users see a read-only demo, screenshot-style explanation, or sample page explaining what the feature does.
* The sample/demo should use fake/static demo data, not the user’s saved vocabulary and not another user’s data.
* The real private/data page should still stay full-access gated even if the index has a nicer free-user demo.

Example pattern:

```txt
if (canUseFeature) {
  show real index/tool
} else {
  show read-only demo/explanation
}
```

This gives Mekuru both:

* Nice UX at the doorway
* Real protection at the actual data page

Possible free-user demo/index behavior:

#### Book Flashcards index

Path:

`app/(protected)/library-study/book-flashcards/page.tsx`

Current behavior:

* This is only an index/doorway.
* It links to `/books/[userBookId]/study`.
* The actual `/study` page is already full-access gated.

Future free-user behavior:

* Free users should see a read-only sample flashcard page or screenshot-style explanation.
* The page should explain that full access lets users study saved vocabulary from each book.
* Free users should not be asked to choose a real book if clicking the book only leads to a locked page.

#### Vocabulary index

Future free-user behavior:

* Free users should see a sample saved vocabulary list/card grid.
* This is probably one of the clearest demo pages because saved vocabulary is a major paid boundary.
* The demo should explain that full access unlocks saved words, book-specific vocabulary lists, and vocabulary study tools.

#### Ability Check / Library Review indexes

Future free-user behavior:

* Free users should see a color/gate demo instead of the real saved-vocabulary study tool.
* Possible sample explanation: Yellow → Green → Blue → Purple.
* Use a fake sample word and fake progress.
* Do not load real saved vocabulary, progress rows, or color data for free users.

#### Kanji Study

Decision needed:

* Kanji Study may be different because the current global Kanji Study can use global `vocabulary_kanji_map` / `vocabulary_cache` data.
* It could potentially remain free as a discovery/acquisition tool.
* If it becomes full-access later, free users should see a sample kanji card/explanation instead of the real study queue.

Important note:

Do not attempt these sample/demo pages yet. First finish the basic feature gates and access helpers. Then return to these indexes as a UX polish pass.


## Test Lab plan

Create a super-teacher-only testing area.

Possible paths:

* `/teacher/testing`
* `/teacher/testing/feature-access`
* `/teacher/testing/ability-check`

### Feature Access Test Page

Should show the current logged-in user’s access state:

* user id / email if useful
* role
* `is_super_teacher`
* `app_access_type`
* `app_access_expires_at`
* app access status
* feature access results

Feature access results should include:

* Add Word
* Curiosity Reading
* Vocabulary List
* Study Flashcards
* Ability Check
* Fluid Reading with saved-word support
* Library Review / Practice
* Book Flashcards
* Vocab Tools
* Story Notes

### Ability Check Test Helper

Should show:

* total saved vocabulary
* total Ability Check cards
* cards due today
* Yellow/readiness cards
* Green/reading gate cards
* Blue/meaning gate cards
* Purple/mastered cards
* Limbo cards
* whether Ability Check is open
* why Ability Check is not open, if blocked by due-card count

Later, possibly add a super-teacher-only button:

* Create 10 test Ability Check cards

This should be handled carefully because it writes test data.

## Next recommended steps

### 1. Finish first-pass feature gates

Continue gating full-access saved-vocabulary features before changing the overall expired-trial behavior.

Main remaining areas to identify/review:

* Vocab Tools tab
* Story Notes tab
* Vocabulary stats / reading colors pages, if they show saved-word/color progress
* Any other Study Hub routes that load saved vocabulary or progress data

### 2. Use Test Lab while testing gates

Use:

`/teacher/testing/feature-access`

to confirm:

* current full-access users/testers still have full access
* simulated free users show full-access features as locked
* simulated full-access users show full-access features as allowed
* teachers/super-teachers still have access

Use:

`/teacher/testing/ability-check`

to understand why Ability Check can or cannot be tested with the current account.

### 3. Later UX polish: access-aware indexes and demos

After the basic gates are stable, improve the free-user experience for index pages.

Goal:

* Do not send free users into dead-end choosers.
* Show honest read-only samples or explanations instead.
* Keep real private/data pages locked.

Likely demo candidates:

* Book Flashcards
* Vocabulary List / Vocabulary Index
* Ability Check / Library Review
* Possibly Kanji Study, depending on the final free/paid decision
