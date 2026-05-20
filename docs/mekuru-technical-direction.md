# Mekuru Technical Direction

## What Mekuru Is

Mekuru is a Japanese reading companion app for learners and teachers. It helps users read real books, save vocabulary, study words through book context, track reading habits, and eventually participate in a wider reading community.

The main goal is not just flashcards. The goal is to help readers build memories with words through books.

## Architecture

Website Page / View
    ↓
Controller
    ↓
Service
    ↓
DAO / Repository
    ↓
Database

## Mekuru Example

User wants to save a word while reading.
    ↓
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

## Current Priorities

1. Keep the app working for current users.
2. Prepare the app for safer student/member access.
3. Clean up large pages gradually.
4. Make the codebase easier for future-me, Codex, ChatGPT, and future developers to understand.
5. Build toward a more independent dictionary/vocabulary system over time.

## Security Priorities Before Wider Student Access

- Review Supabase RLS policies.
- Confirm users can only access their own books, words, stats, and sessions.
- Confirm teachers can only access students they are connected to.
- Confirm teacher/admin routes are protected server-side, not only hidden in the UI.
- Keep emails private and only available where truly needed.
- Do not store passwords in Mekuru tables.
- Validate user inputs.
- Make sure service role keys are never exposed in frontend code.
- Review API routes and server actions.

## Architecture Rules Going Forward

- Pages should become thinner over time.
- Reusable UI should move into components.
- App rules should move into service/helper files.
- Supabase/database calls should move into repository/data files.
- Shared types should be named clearly.
- Access/permission logic should be centralized when possible.
- Avoid giant rewrites. Refactor one page or feature at a time.

## Suggested File Pattern

For larger features, use a pattern like:

View = what the user sees
Controller = what the user is trying to do
Service = what Mekuru's rules say should happen
DAO = how data is fetched or saved
DB = where data is stored and protected

> **Views show. Controllers receive. Services decide. DAOs fetch/save. The DB protects.**

For Example:

features/
  curiosity-reading/
    view.tsx
    controller.ts
    service.ts
    dao.ts
    types.ts
    components/

app/(protected)/books/[userBookId]/curiosity-reading/
  page.tsx              = Website page / view entry point
  components/           = UI pieces
  controller.ts         = user actions / request handling
  service.ts            = Mekuru rules for this feature
  dao.ts                = Supabase/database queries
  types.ts              = shared types for this feature