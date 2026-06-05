# Global Word Entry Wiring Map

No-code wiring map for:

`app/(protected)/teacher/global-words/page.tsx`

## Current Status

Global Word Entry is currently a visual scaffold only.

It provides:
* teacher/super-teacher route access check
* Add Word-style single-entry UI
* surface / name field
* reading field
* meaning / note field
* entry type selector
* optional JLPT selector
* optional common / high-priority flag
* optional cultural / context note
* visual-only search placeholder
* visual-only save placeholder
* page-local components under `app/(protected)/teacher/global-words/components`

It intentionally does not:
* write to `vocabulary_cache`
* write to `user_book_words`
* call `/api/vocabulary-kanji-map/generate`
* call `/api/word-sky/approve`
* create global records
* create tables
* change RLS
* move Add Word helpers or save handlers
* remove existing Add Word super-teacher tools

## Product Purpose

Global Word Entry should be a careful single-entry workflow for global vocabulary and cultural reference preparation.

It is not a bulk workflow.

Good entry types:
* vocabulary
* person
* place
* work title
* organization
* cultural reference
* other

Primary home:
* `/teacher/general-upkeep`

Secondary dashboard access:
* Teacher Hub card/link

## Wiring Still Needed

### 1. Data Model Decision

Decide where each global entry type should live.

Open question:
Should all global entries use `vocabulary_cache`, or should non-vocabulary cultural references use a separate global reference table?

Likely direction:
* normal vocabulary can continue using `vocabulary_cache`
* Word Sky vocabulary candidates can continue using the existing Word Sky approval path
* famous people, places, work titles, organizations, and cultural references may need either:
  * carefully shaped `vocabulary_cache` rows with type metadata, or
  * a new global reference table after RLS/design review

Do not create a table until this decision is made.

### 2. Form Draft Shape

Create a clear page-local draft object before wiring persistence.

Fields likely needed:
* `surface`
* `reading`
* `meaning`
* `entry_type`
* `jlpt`
* `is_common`
* `context_note`
* future optional fields:
  * `source`
  * `source_url`
  * `review_status`
  * `word_sky_candidate`
  * `created_by`
  * `approved_by`

Keep this mapping page-local until persistence is chosen.

### 3. Validation

Add validation before any save action.

Minimum validation:
* surface / name is required
* meaning / note is required
* reading is required for vocabulary entries
* reading may be optional for some cultural references, depending on final rules
* entry type is required

Suggested validation messages:
* `Add a surface or name.`
* `Add a reading.`
* `Add a meaning or note.`
* `Choose an entry type.`

### 4. Lookup Behavior

The current search button is placeholder-only.

Future vocabulary lookup can safely reuse the same conceptual behavior as Add Word:
* call `/api/jisho`
* build exact Jisho candidates
* let the teacher choose the correct surface + reading + meaning
* preserve the distinction between same-surface entries with different readings

Important identity rule:
* prefer `vocabulary_cache_id` when available
* otherwise use `surface + reading`
* only fall back to `surface` when no reading exists

Do not use surface-only identity for entries like `市【いち】` and `市【し】`.

### 5. Save Flow

The current save action should remain placeholder-only until the target persistence path is chosen.

Future save flow should likely be split by entry type:
* vocabulary:
  * find or create a `vocabulary_cache` row
  * preserve `surface + reading` distinction
  * optionally mark as common/JLPT
  * optionally prepare as Word Sky candidate
  * optionally generate `vocabulary_kanji_map`
* person/place/work title/organization/cultural reference:
  * save to the chosen global reference storage
  * keep cultural/context note
  * do not accidentally treat every reference as normal student vocabulary

Do not write to `user_book_words`.

### 6. Word Sky Wiring

Word Sky approval should not be automatic.

Future options:
* save global entry only
* save and mark as Word Sky candidate
* save and approve for Word Sky, super-teacher only

Before wiring:
* confirm which entry types are allowed in Word Sky
* confirm whether non-vocabulary cultural references should ever appear there
* keep approval gated to super-teacher/admin behavior

### 7. Kanji Map Wiring

Only generate `vocabulary_kanji_map` after a real `vocabulary_cache_id` exists.

Future behavior:
* vocabulary entry saved
* cache id returned
* if surface has kanji, call `/api/vocabulary-kanji-map/generate`
* show success/warning state

Do not call kanji-map generation for placeholder drafts.

### 8. Access And Permissions

Current route guard allows teachers and super teachers.

Before real saving, decide whether all teachers can save global entries or whether regular teachers can only create drafts.

Possible permission model:
* regular teacher:
  * create draft / suggestion
  * maybe cannot approve globally
* super teacher:
  * save to global cache
  * approve Word Sky candidate
  * run kanji-map generation
  * resolve/review global data cleanup

Do not change RLS until the permission model is final.

### 9. Review / Queue Behavior

If regular teachers can submit global suggestions, add review status.

Possible states:
* draft
* submitted
* needs review
* approved
* rejected

Possible future home:
* `/teacher/words`
* `/teacher/general-upkeep`
* a dedicated global word review queue

This should not be mixed into the existing Kanji Queue without a deliberate design pass.

### 10. Feedback States

Add clear UI states when wiring begins.

Needed states:
* validating
* looking up
* saving
* saved
* save failed
* duplicate found
* cache row reused
* kanji-map generated
* Word Sky candidate prepared
* Word Sky approved

The current message area can be reused initially.

### 11. Duplicate Handling

Duplicate detection must not collapse by surface alone.

Preferred order:
* exact `vocabulary_cache_id`
* exact `surface + reading`
* surface-only fallback only when reading is absent

For Jisho-style homographs:
* `市【いち】` market/fair
* `市【し】` city/municipality

These must remain distinct.

### 12. Tests / Verification

Before enabling real save:
* build passes
* teacher access still works
* non-teacher access is blocked
* placeholder save does not write anything
* real save writes only to the intended destination
* duplicate detection distinguishes same-surface different-reading entries
* vocabulary entries can generate kanji-map rows only after cache save
* Word Sky approval remains super-teacher only
* Add Word book save flow is unchanged

## Suggested Implementation Order

1. Keep current visual scaffold stable.
2. Decide data model for non-vocabulary global references.
3. Add page-local validation and draft shaping.
4. Add safe Jisho lookup for vocabulary entries only.
5. Add duplicate detection using `vocabulary_cache_id` or `surface + reading`.
6. Add save-cache-only behavior for super teachers.
7. Add optional kanji-map generation after cache save.
8. Add optional Word Sky candidate / approval behavior.
9. Add regular-teacher suggestion/review flow only if desired.
10. Remove or retire older Add Word super-teacher tools after the new flow fully replaces them.

## Guardrails

Do not wire everything at once.

Keep these separate:
* global cache save
* cultural reference storage
* Word Sky approval
* kanji-map generation
* review queue behavior
* regular teacher suggestion behavior
* Add Word book save behavior

The safest next code pass is validation plus draft shaping only, with save still disabled.
