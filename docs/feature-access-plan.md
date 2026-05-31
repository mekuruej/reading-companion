# Mekuru Feature Access Plan

Mekuru should gradually move toward a feature-based access model instead of a simple “user has app access / user does not have app access” model.

The goal is to let users keep their accounts long-term while changing what features they can use depending on trial, paid membership, book club access, teacher access, or free access.

## Core Access Idea

Users should be able to join Mekuru freely and keep their account even after a trial, book club, or paid access period ends.

Instead of removing access completely, Mekuru should move users into a free reading-life tracker layer.

```txt
Free account
    ↓
3-week full-access trial
    ↓
Free feature access unless upgraded, enrolled, or granted full access
```

This reduces manual “watchdog” work and supports users who join and leave book clubs over time.

## Access States

Mekuru may eventually support access states such as:

* Free
* Trial full access
* Paid full access
* Book club full access
* Teacher
* Super teacher / admin
* Inactive or suspended, only when needed for abuse/admin reasons

The normal end of a trial or book club should not make the user inactive. It should move them to free access.

## Free Access Purpose

Free access should make Mekuru useful as a reading-life tracker.

Free users should be able to keep reading, tracking, reflecting, and discovering books.

Free access should help users build the habit:

```txt
I read.
I track it.
I remember what I read.
I come back.
```

## Free Features

Likely free features:

* Book tracking
* Book Hub index
* Book Info tab
* Reading Reflection tab
* Just Reading / timer-only reading
* Possibly Listening timer
* Basic book stats snapshots
* One basic global stats page.
* Possibly Find Your Next Book / global discovery, once shared data is safely separated from private user data

Free users should not be blocked from the Book Hub index because they can still use meaningful Book Hub features.

## Paid / Full Access Purpose

Paid, trial, and book-club full access should unlock Mekuru’s deeper learning engine.

The paid value is:

```txt
Turn your reading into vocabulary growth.
```

## Paid / Full Access Features

Likely paid or full-access features:

* Curiosity Reading
* Fluid Reading with saved-word support
* Vocabulary saving
* Vocabulary List
* Study Flashcards
* Ability Check
* Reading color stages
* Vocab Tools tab
* Story Notes tab
* Saved-word/color/ability systems
* Vocabulary and study stats
* Future shared flashcards / shared study decks

Free users should not have vocabulary saving capabilities. Vocabulary saving, color progress, and study tools should remain part of paid, trial, or book-club full access.

## Vocabulary and Color Logic

If a free user has never had full access, they will not have saved vocabulary and therefore will not have reading colors.

If a user previously had paid, trial, or book-club full access, their saved vocabulary and color progress should not be deleted when they move to free access.

Instead, vocabulary data should be preserved but mostly read-only or locked.

Example message:

```txt
Your vocabulary progress is saved. Full vocabulary study is available with paid access, trial access, or book club access.
```

The user’s saved words, color stages, encounter history, and study history should remain available again if they regain full access.

## Feature-Based Access Helper

Mekuru should eventually use a feature-based access helper instead of scattering access checks across pages.

A future helper such as `getFeatureAccess(user)` could return permissions like:

```txt
canTrackBooks: true
canUseBookInfo: true
canUseReadingReflection: true
canUseJustReadingTimer: true
canUseListeningTimer: true

canUseCuriosityReading: false
canUseSavedWordReading: false
canSaveVocabulary: false
canUseVocabularyList: false
canUseStudyFlashcards: false
canUseAbilityCheck: false
canUseVocabTools: false
canUseStoryNotes: false
canUseVocabularyStats: false
```

This would allow pages to show free features normally and show paid features as locked, previewable, or demo-only.

## Index and Demo Page Behavior

The Book Hub index should remain useful for free users because free users can still use some book-based features.

The Vocabulary Index is different because most vocabulary tools are paid/full-access features.

The Vocabulary Index should not feel like an empty dead end for free users. It should include an example or demo page.

Possible route:

```txt
/demo/vocabulary-list
```

or:

```txt
/examples/vocabulary-list
```

The demo should use static sample data, not real user data.

The demo vocabulary page can show:

* Sample saved words
* Readings
* Meanings
* Book encounter context
* Color/study stage previews
* A note explaining that vocabulary saving and deeper study tools require full access

Some study tools may also benefit from demo examples, such as:

* Example Ability Check
* Example Study Flashcards
* Example Reading Colors
* Example “where you met this word” memory card

These examples should explain the value of the study system without giving free users actual vocabulary-saving or study-progress functionality.

## Global Discovery and Find Your Next Book

Global discovery may be valuable as a free feature because it helps Mekuru feel alive and encourages users to track and reflect on books.

However, global discovery should not expose private `user_books` rows directly.

Find Your Next Book and other shared discovery tools should eventually read from a separate anonymous/shared signal source rather than directly from private library data.

Possible future table or view:

```txt
book_reader_signals
```

or:

```txt
public_book_reviews
```

This shared source should contain only safe public fields, such as:

```txt
book_id
reader_level
rating_difficulty
rating_entertainment
reader_advice
created_at
```

Private library rows, private reading history, saved vocabulary, and user identity should remain protected.

## Design Principle

Free Mekuru should be:

```txt
A reading-life tracker.
```

Paid/full-access Mekuru should be:

```txt
A reading-powered vocabulary and study system.
```

The free version should help people keep reading.

The paid version should help people learn deeply from what they read.


## Stats Access Direction

Mekuru stats should be divided into two main layers:

```txt
Book-level stats
Global reading-life overview
```

### Book-level stats

Each book should use a small set of book-specific stats snapshots.

These should be useful for free users because they support the reading-life tracker side of Mekuru.

Likely book-level snapshots:

* Reading activity for this book
* Progress / pages / time
* Reflection or reader-fit information
* Book-specific rhythm or completion summary

Saved-word and vocabulary-based data should only appear for users with full access. For free users, those parts should be hidden, locked, or replaced with a gentle note.

The Book Hub should remain useful for free users because they can still track and reflect on books.

### Global stats area

The global stats area should probably be simpler for free users.

Instead of many detailed stats pages, free users may only need one global page that connects their books together.

This page could act as a reading-life overview, showing things like:

* Books read
* Currently reading
* Finished books
* Reading days
* Pages or time tracked
* Recent reflections
* Book types read
* Books that felt easy or difficult
* Links back to individual Book Hubs

The purpose of the global stats page is not deep analytics at first. It is to help users see their reading life across books.

### Paid / full-access stats

Full-access users can unlock deeper stats connected to saved vocabulary and study progress, such as:

* Vocabulary growth
* Saved-word history
* Reading colors
* Ability Check movement
* Study rhythm
* Book vocabulary patterns
* Deeper vocabulary/study analytics

These stats belong to Mekuru’s paid/full-access learning engine because they depend on saved words and study tools.

### Design principle

Free stats should answer:

```txt
What have I been reading?
```

Full-access stats can answer:

```txt
What am I learning from what I read?
```
## Global stats area

The global stats area should be simpler for free users and should not duplicate the main Library page.

The Library page already shows core shelf information such as:

* Currently reading
* Finished books
* User’s active book list

The global stats page should instead connect the user’s reading activity across books.

Possible global reading-life overview metrics:

* Total reading days
* Total pages tracked
* Total reading/listening time
* Reading rhythm over time
* Recent reading activity
* Book types read
* Books that felt easy or difficult
* Reflection patterns
* Links back to individual Book Hubs

The purpose of the global stats page is not to repeat the library. It should help users understand their reading habits across books.

Free stats should answer:

```txt
How have I been reading?
```

Full-access stats can additionally answer:

```txt
What am I learning from what I read?
```
