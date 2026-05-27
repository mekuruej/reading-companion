# Mekuru Architecture Layers

Mekuru should gradually move toward a clear top-down architecture pattern:

```txt
Website Pages / Views
    ↓
Controllers
    ↓
Services
    ↓
DAOs / Repositories
    ↓
Database
```

The goal is not to make the app more complicated. The goal is to give each part of the app one clear job.

---

## Simple Summary

```txt
Views show.
Controllers receive.
Services decide.
DAOs fetch and save.
The database stores and protects.
Test pages let developers safely experiment.
```

---

## Website Pages / Views

Pages/views are the screens users see.

Examples:

- Book Hub
- Curiosity Reading
- Fluid Reading
- Vocabulary List
- Library Study
- Stats
- Teacher Portal

Pages should mostly handle:

- layout
- visible UI
- connecting components together

Pages should not contain every database query, permission rule, validation rule, and business rule.

---

## Controllers

Controllers handle requests and user actions.

Examples:

- Save a word
- Finish a reading session
- Assign a book to a student
- Update a vocabulary entry
- Load a teacher page
- Submit a reflection

Controllers should:

1. Receive the request/action.
2. Check the required information.
3. Call the correct service.
4. Return a clear success or error result.

In Next.js, controllers may appear as:

- API routes
- route handlers
- server actions
- action functions used by pages

---

## Services

Services contain Mekuru’s app rules and learning logic.

Examples:

- Saving a user book word
- Computing word color/study stage
- Checking whether a teacher can access a student
- Handling reading/listening session rules
- Handling trial/member access rules
- Connecting saved words to shared vocabulary data

Services answer:

> What should happen?

This is where Mekuru’s pedagogy, reading flow, and business rules should live.

---

## DAOs / Repositories

DAOs, also called repositories, handle database access.

Examples:

- `getUserBookById()`
- `getWordsForUserBook()`
- `insertUserBookWord()`
- `updateReadingSession()`
- `getTeacherStudents()`
- `getVocabularyCacheEntry()`

DAOs answer:

> How do we get or save this data?

They should contain the Supabase queries so database details are not scattered through pages and services.

---

## Database

The database stores the actual data and should also protect important rules.

Examples:

- `user_books`
- `books`
- `user_book_words`
- `vocabulary_cache`
- `user_book_reading_sessions`
- `profiles`
- teacher/student relationship tables

The database should use:

- RLS policies
- constraints
- foreign keys
- indexes
- required fields

The database should help protect data integrity and privacy, not just hold information.

---

## Test Pages / Sandbox Pages

Test pages are developer-only pages used to safely test pieces of Mekuru before connecting them to the real user experience.

They can be useful for checking:

- new UI components
- mobile layouts
- form behavior
- save/update flows
- Supabase query results
- controller behavior
- service logic
- teacher/student access rules
- vocabulary cache behavior
- reading session behavior

Test pages should not be treated as normal app pages.

They should be:

- clearly named
- kept separate from real user routes
- local-only, admin-only, or super-teacher-only
- removed before production if no longer needed

Examples:

- `test-word-save`
- `test-vocab-cache`
- `test-reading-session`
- `test-teacher-access`
- `test-mobile-layout`

Good rule:

> Test pages are for building and checking Mekuru safely. They are not part of the learner or teacher experience.

# Page Name Refactor Map

Extraction Tasks

## Remaining

- [ ] A. Task name
1. Move:
2. Stay in `page.tsx`:
3. Props needed:
4. Type:
5. Risk:
Notes.

Target Architecture Placement
...

Old Map
...

## Finished
...