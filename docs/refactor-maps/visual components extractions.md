# Visual Component Extraction Cleanup Tracker

## How to use this doc

This is a working cleanup tracker, not an archive.

When a page is finished, delete that entire page section from this document.
When all sections are gone, the visual-component extraction phase is complete.

## Refactor Rule

For this phase, extract **visual/presentational components only**.

Keep these in `page.tsx` for now:

* data fetching
* Supabase calls
* access checks
* page-level state
* handlers
* mutations
* derived calculations
* study progression logic
* save/order/update workflows

Good extraction targets:

* header cards
* stat cards
* metric grids
* banners
* loading/error/empty states
* modals
* tables
* card grids
* explanatory panels
* section wrappers
* repeated action layouts

---

# Current Visual-Only Cleanup Target

## `app/(protected)/books/[userBookId]/study/page.tsx`

**Current lines:** 2294
**Reason parked:** Book flashcard sequencing and answer logic are the real bulk.
**Next later action:** Map study sequencing before extracting more.


# Parked for Later: Architecture-Heavy Refactors

These are **not part of the current visual cleanup pass**.

Move these to a separate refactor map later, then delete this section from this document.

## `app/(protected)/books/[userBookId]/page.tsx`

**Current lines:** 5582
**Reason parked:** Book Hub is dominated by Supabase/save/book metadata flows.
**Next later action:** Dedicated staged Book Hub refactor map.

## `app/(protected)/library-study/check/page.tsx`

**Current lines:** 3484
**Reason parked:** Ability Check has study logic, review branches, and answer-flow complexity.
**Next later action:** Map study logic before extracting more.

## `app/(protected)/teacher/library/[teacherBookId]/page.tsx`

**Current lines:** 1601
**Reason parked:** Teacher prep editor/order/save behavior is sensitive.
**Next later action:** Carefully extract saved item table/row detail and definition-check card only.

## `app/(protected)/teacher/kanji/page.tsx`

**Current lines:** 1601
**Reason parked:** Kanji queue counting, reports, flags, and alerts need clearer definitions first.
**Next later action:** Map queue states before broad cleanup.

---

# Completion Rule

The visual-component extraction phase is complete when:

1. Every section under **Remaining Visual-Only Cleanup Targets** has been deleted.
2. The parked architecture-heavy pages have been moved to their own later refactor map or intentionally deferred.
3. No remaining `page.tsx` over 500 lines is large mainly because of inline presentational JSX.
