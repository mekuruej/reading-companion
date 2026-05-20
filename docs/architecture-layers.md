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

The goal is not to make the app more complicated. The goal is to make each part of the app responsible for one clear job.

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

Pages should mostly be responsible for layout, visible UI, and connecting components together.

Pages should not contain all database queries, permission rules, validation rules, and business logic.

## Controllers

Controllers handle requests and user actions.

Examples:

- Save a word
- Finish a reading session
- Assign a book to a student
- Update a vocabulary entry
- Load a teacher page
- Submit a reflection

Controllers should receive the request, check the required information, call the correct service, and return a clear success or error result.

In Next.js, controllers may appear as API routes, route handlers, server actions, or action functions used by pages.

## Services

Services contain Mekuru's app rules and learning logic.

Examples:

- Saving a user book word
- Computing word color/study stage
- Checking whether a teacher can access a student
- Handling reading/listening session rules
- Handling trial/member access rules
- Connecting saved words to shared vocabulary data

Services should answer:

> What should happen?

This is where Mekuru's pedagogy, reading flow, and business rules should live.

## DAOs / Repositories

DAOs, also called repositories, handle database access.

Examples:

- `getUserBookById()`
- `getWordsForUserBook()`
- `insertUserBookWord()`
- `updateReadingSession()`
- `getTeacherStudents()`
- `getVocabularyCacheEntry()`

DAOs should answer:

> How do we get or save this data?

They should contain the Supabase queries so that pages and services do not have database details scattered everywhere.

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

The database should use RLS policies, constraints, foreign keys, indexes, and required fields to protect data integrity and privacy.

## Simple Summary

```txt
Views show.
Controllers receive.
Services decide.
DAOs fetch and save.
The database stores and protects.
```

## Test Pages / Sandbox Pages

Test pages are developer-only pages used to safely test pieces of Mekuru before connecting them to the real user experience.

They can be useful for checking:

- New UI components
- Mobile layouts
- Form behavior
- Save/update flows
- Supabase query results
- Controller behavior
- Service logic
- Teacher/student access rules
- Vocabulary cache behavior
- Reading session behavior

Test pages should not be treated as normal app pages.

They should be clearly named and kept separate from real user routes.

Examples:

- `test-word-save`
- `test-vocab-cache`
- `test-reading-session`
- `test-teacher-access`
- `test-mobile-layout`

Test pages should be local-only, admin-only, super-teacher-only, or removed before production if they are no longer needed.

A good rule:

> Test pages are for building and checking Mekuru safely. They are not part of the learner or teacher experience.