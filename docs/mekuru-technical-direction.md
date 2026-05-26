# Mekuru Technical Direction

## What Mekuru Is

Mekuru is a Japanese reading companion app for learners and teachers.

It helps users:

- read real books
- save vocabulary
- study words through book context
- track reading habits
- build toward a wider reading community

Mekuru is not just a flashcard app. The main goal is to help readers build memories with words through books.

---

## Current Priorities

1. Keep the app working for current users.
2. Prepare the app for safer student/member access.
3. Clean up large pages gradually.
    For page thinning, start with low-risk presentational components before extracting services, DAOs, or controllers.
4. Make the codebase easier for future-me, Codex, ChatGPT, and future developers to understand.
5. Build toward a more independent dictionary/vocabulary system over time.

---

## Architecture Pattern

Mekuru should gradually move toward this top-down structure:

```txt
Website Page / View
    ↓
Controller
    ↓
Service
    ↓
DAO / Repository
    ↓
Database
```

Simple summary:

> **Views show. Controllers receive. Services decide. DAOs fetch/save. The DB protects.**

## What Each Layer Means

### Website Page / View

The page is what the user sees.

It should mostly handle:

- layout
- visible UI
- connecting components together

A page should not contain every database query, permission rule, validation rule, and app rule.

### Controller

The controller handles what the user is trying to do.

Examples:

- save a word
- finish a reading session
- assign a book to a student
- update a profile

The controller receives the request/action, checks the basic information, calls the right service, and returns a success or error result.

### Service

The service contains Mekuru’s app rules and learning logic.

Examples:

- Is this word valid?
- Can this teacher access this student?
- Should this word connect to `vocabulary_cache`?
- What happens when a reading session is saved?
- What study/color stage should this word move to?

Services answer:

> What should happen?

### DAO / Repository

The DAO/repository handles database access.

Examples:

- `getUserBookById()`
- `getWordsForUserBook()`
- `insertUserBookWord()`
- `updateReadingSession()`
- `getTeacherStudents()`

DAOs answer:

> How do we get or save this data?

They should contain the Supabase queries so database details are not scattered through pages.

### Database

The database stores and protects the data.

It should use:

- RLS policies
- constraints
- foreign keys
- indexes
- required fields

The app code should be clean, but the database should also protect important rules.

---

## Mekuru Example: Saving a Word

User wants to save a word while reading.

```txt
Curiosity Reading page shows the search/save UI.
    ↓
Controller handles the save-word action.
    ↓
Service decides the rules:
  - Is the word valid?
  - Does it connect to vocabulary_cache?
  - Does it belong to this user_book?
  - What notices/errors should happen?
    ↓
DAO inserts/updates the correct Supabase rows.
    ↓
Database stores and protects the data with RLS/constraints.
```

This keeps the page from becoming responsible for everything.

---

## Security Priorities Before Wider Student Access

Before wider student/member access, Mekuru should review:

- Supabase RLS policies
- user-owned data access
- teacher/student access rules
- teacher/admin route protection
- email privacy
- password handling
- user input validation
- service role key safety
- API routes and server actions

Important rules:

- Users should only access their own books, words, stats, and sessions.
- Teachers should only access students they are connected to.
- Teacher/admin routes must be protected server-side, not only hidden in the UI.
- Emails should be private and only available where truly needed.
- Passwords should never be stored in Mekuru tables.
- Service role keys should never be exposed in frontend code.

---

## Architecture Rules Going Forward

- Pages should become thinner over time.
- Reusable UI should move into components.
- App rules should move into service/helper files.
- Supabase/database calls should move into DAO/repository files.
- Shared types should be named clearly.
- Access/permission logic should be centralized when possible.
- Avoid giant rewrites.
- Refactor one page or feature at a time.

The goal is not to make Mekuru complicated. The goal is to make each part responsible for one clear job.

---

## Suggested File Pattern

For larger features, use a pattern like:

```txt
features/
  curiosity-reading/
    view.tsx
    controller.ts
    service.ts
    dao.ts
    types.ts
    components/
```

Or, when keeping files closer to the route:

```txt
app/(protected)/books/[userBookId]/curiosity-reading/
  page.tsx       = Website page / view entry point
  components/    = UI pieces
  controller.ts  = user actions / request handling
  service.ts     = Mekuru rules for this feature
  dao.ts         = Supabase/database queries
  types.ts       = shared types for this feature
```

The exact folder structure can change. The responsibility pattern should stay the same:

```txt
View       = what the user sees
Controller = what the user is trying to do
Service    = what Mekuru's rules say should happen
DAO        = how data is fetched or saved
DB         = where data is stored and protected
```

---

## Refactoring Rule

Do not rewrite the whole app at once.

When working on a large page, gradually move code into clearer layers:

1. Move repeated UI into components.
2. Move user actions into controller functions.
3. Move Mekuru rules into service/helper functions.
4. Move Supabase queries into DAO/repository functions.
5. Keep the page/view as thin and readable as possible.

---

## Things Not to Change Casually

Be careful when changing:

- role/access logic
- Supabase RLS policies
- user book ownership rules
- teacher/student relationship rules
- vocabulary cache structure
- word color/study stage logic
- reading session save logic
- trial/member access rules

These areas affect privacy, app access, and learning logic.

---

## Dictionary Direction

Long-term, Mekuru should search its own dictionary/vocabulary layer first instead of relying on live Jisho searches forever.

Possible direction:

- Use a properly licensed dictionary source such as JMdict.
- Keep Mekuru-specific vocabulary enrichment separate.
- Allow teacher corrections and custom notes.
- Connect dictionary entries to kanji reading support and book encounters.

This is not an emergency task, but it is part of making Mekuru more stable and independent.

---

## Future Developer Notes

Mekuru was built by a Japanese teacher and lifelong learner using AI-assisted coding.

The product ideas, pedagogy, reading flows, and learning logic are intentional.

The codebase may need cleanup, but the app structure reflects real teaching and learner needs.