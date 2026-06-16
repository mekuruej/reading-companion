# Component Organization Audit

No-code organization audit for extracted visual components across:

- `app/`
- `components/`

This is documentation only. Do not move, rename, refactor, or delete files from this audit alone.

## Current Summary

The current component organization is mostly understandable. The visual thinning work has generally kept page-only components next to their page, which is the safest pattern for the current codebase.

The cleanest folders are page-local `components/` directories where the component names clearly match the route. The most ambiguous folders are the large route-level shared folders that now contain several different feature families.

Most important mixed folders:

- `app/(protected)/books/[userBookId]/components/`
- `app/(protected)/library-study/components/`

The root `components/` folder is mostly app-wide shared UI, but it has a few files that should be checked before assuming they are still used.

## Recommended Convention

Use this convention for future extraction and cleanup:

| Component type | Suggested location |
|---|---|
| Used by one page only | `app/.../page-route/components/` |
| Used by sibling pages in one feature area | `app/.../feature/_shared/` or `app/.../feature/components/` |
| Used across unrelated app areas | root `components/` |
| Domain helper UI shared by several book subpages | a clearly named area folder, not a generic bucket |
| Components with save/access/query behavior | keep near the owning page until an architecture pass |

## Folder Audit

| Folder path | What it seems to contain | Scope | Status |
|---|---|---|---|
| `app/(protected)/books/add/components/` | Add-by-ISBN visual pieces | Page-local | Looks clean |
| `app/(protected)/vocab/bulk/components/` | Bulk Add panels, rows, messages, save bar | Page-local | Looks clean |
| `app/dashboard/components/` | Dashboard visual sections | Page-local | Looks clean |
| `app/(protected)/teacher/kanji/components/` | Teacher kanji queue UI | Page-local | Looks clean |
| `app/(protected)/teacher/students/components/` | My Students UI | Page-local | Looks clean |
| `app/(protected)/teacher/assign/components/` | Assignment page and prep shelf pieces | Page-local-ish | Okay, slightly large |
| `app/(protected)/teacher/books/add/components/` | Teacher global book add UI | Page-local | Looks clean |
| `app/(protected)/teacher/books/[userBookId]/components/` | Teacher book review UI | Page-local | Looks clean |
| `app/(protected)/teacher/library/[teacherBookId]/components/` | Teacher prep book UI | Page-local | Looks clean |
| `app/(protected)/teacher/library/[teacherBookId]/follow/components/` | Teacher follow-along UI | Page-local with shared read-along imports | Mostly okay |
| `app/(protected)/teacher/components/` | Teacher Hub cards, alerts, header, today section | Section-shared or hub-local | Okay, not a dumping ground yet |
| `app/(protected)/books/[userBookId]/components/` | Book Hub, Add Word, Curiosity, Study, tabs, fields | Mixed / ambiguous | Needs future cleanup |
| `app/(protected)/books/[userBookId]/readalong/components/` | Learner Read Along UI | Page-local, but reused by teacher follow-along | Needs shared-location consideration |
| `app/(protected)/books/[userBookId]/words/components/` | Vocab List UI | Page-local | Looks clean |
| `app/(protected)/books/[userBookId]/words/[wordId]/components/` | Word detail UI | Page-local | Looks clean |
| `app/(protected)/books/[userBookId]/stats/components/` | Book stats UI | Page-local | Looks clean |
| `app/(protected)/library-study/components/` | Ability Check, Kanji Study, Library Review, Word Sky | Mixed / ambiguous | Needs cleanup later |
| `app/(protected)/library-study/kana/components/` | Kana-only study UI | Page-local | Looks clean |
| `app/(protected)/community/stats/components/` | Community stats hub UI | Page-local | Looks clean |
| `app/(protected)/community/stats/*/components/` | Stats subpage charts, cards, filters | Page-local, with duplicated generic names | Okay now, possible later consolidation |
| `app/(protected)/community/profile/preview/components/` | Profile preview UI | Page-local | Looks clean |
| `app/(protected)/community/profile/settings/components/` | Profile settings UI | Page-local | Looks clean |
| `app/(protected)/discovery/components/` | Discovery hub UI | Page-local | Looks clean |
| `app/(protected)/discovery/dictionary/components/` | Dictionary UI | Page-local | Looks clean |
| `app/(protected)/discovery/find-books/components/` | Find Books UI | Page-local | Looks clean |
| `app/(protected)/users/[username]/books/components/` | Public/user library page UI | Page-local | Looks clean |
| `app/(protected)/vocab/explore/components/` | Word history / vocab explore UI | Page-local | Looks clean |
| root `components/` | Header, gates, shared widgets, shared combobox, kanji lookup | App-wide shared plus possible stale | Mostly okay, needs small audit |

## Notable Findings

### Mostly Clean Page-Local Folders

Most visual components that were extracted from one page still live next to that page. That is good and should remain the default.

Good examples:

- `app/(protected)/vocab/bulk/components/`
- `app/(protected)/teacher/kanji/components/`
- `app/(protected)/teacher/students/components/`
- `app/(protected)/teacher/books/add/components/`
- `app/(protected)/books/add/components/`

### Mixed Book Route Component Folder

`app/(protected)/books/[userBookId]/components/` is the largest and most ambiguous folder.

It currently contains several feature families:

- `BookHub*`
- `AddWord*`
- `Curiosity*`
- `Study*`
- Book Hub tabs such as `BookInfoTab`, `ReadingTab`, `RatingTab`, `StoryTab`, `VocabTab`
- Small field components such as `DateField`, `DifficultyField`, `StarRatingField`

This folder is understandable only if the reader already knows that many book subpages were thinned from nearby routes. It is the closest thing to a dumping ground.

### Mixed Library Study Component Folder

`app/(protected)/library-study/components/` groups several sibling study experiences:

- Ability Check
- Kanji Study
- Library Review / Practice
- Word Sky

This is not immediately dangerous, but it is not very discoverable. Kana already has `app/(protected)/library-study/kana/components/`, which makes the shared folder feel even more mixed.

### Read Along Components Are No Longer Purely Page-Local

Teacher follow-along imports these learner read-along components:

- `ReadAlongPageNavigator`
- `ReadAlongReaderShell`
- `ReadAlongSupportModeTabs`

They currently live under:

`app/(protected)/books/[userBookId]/readalong/components/`

That works, but long relative imports from teacher follow-along make this fragile. If teacher follow-along continues to share these, they should eventually move to a clearly shared read-along/support-reading location.

### Root Shared Components

Root `components/` mostly contains genuinely app-wide pieces:

- `Header`
- `AppHeaderGate`
- `AppAccessGate`
- `TeacherAccessGate`
- `AccessDeniedMessage`
- `ChapterNameCombobox`
- `LibraryColorBadge`
- `KanjiComponentLookup`

Possible stale or future-use files from a simple import-count pass:

- `components/ColorLegend.tsx`
- `components/KanjiPicker.tsx`

Do not delete them from this audit alone. Confirm intent first.

## Safe Future Cleanup Moves

These should be treated as future import-only cleanup candidates, not immediate work.

| Candidate | Safer future direction |
|---|---|
| `AddWord*` components | Move under `app/(protected)/books/[userBookId]/add-word/components/` |
| `Curiosity*` components | Move under `app/(protected)/books/[userBookId]/curiosity-reading/components/` |
| `Study*` components | Move under `app/(protected)/books/[userBookId]/study/components/` |
| `ReadAlongPageNavigator`, `ReadAlongReaderShell`, `ReadAlongSupportModeTabs` | Move to a shared read-along folder if teacher follow-along keeps using them |
| `library-study/components/KanjiStudy*` | Move under `app/(protected)/library-study/kanji/components/` if only kanji uses them |
| `library-study/components/AbilityCheck*` | Move under `app/(protected)/library-study/check/components/` |
| `library-study/components/WordSky*` | Move under `app/(protected)/library-study/word-sky/components/` |
| root `ColorLegend.tsx`, `KanjiPicker.tsx` | Verify whether stale before removing or relocating |

## Do Not Move Yet

Avoid moving these until after a deliberate architecture pass:

- `BookInfoTab`
- `ReadingTab`
- `RatingTab`
- `StoryTab`
- `VocabTab`
- `SimpleTimedSessionPage`
- Anything in Book Hub that receives many stateful props from `page.tsx`
- Teacher prep / follow-along components while ordering, support links, and prep flow are still active
- Access gates and access states
- `ChapterNameCombobox`, because it is actively shared across add-word flows

## Suggested Cleanup Priority

1. Leave everything as-is while behavior is still actively changing.
2. Clean `app/(protected)/books/[userBookId]/components/` first, but only by feature prefix.
3. Clean `app/(protected)/library-study/components/` into page-local study folders.
4. Consider a shared read-along folder for learner + teacher follow-along pieces.
5. Audit root `components/` for stale unused files.

## Import-Risk Notes

Most cleanup moves would be import-only, but the risk is still moderate because dynamic route folders create long and brittle relative imports.

Highest-risk current pattern:

- Teacher follow-along importing learner read-along components through long relative paths.

Future cleanup should be mechanical and narrow:

1. Move one component group.
2. Update imports only.
3. Run build.
4. Do not change behavior, props, query logic, access logic, or save handlers.

