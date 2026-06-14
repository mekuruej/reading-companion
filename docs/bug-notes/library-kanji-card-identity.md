# Kanji Study Card Identity Bug Note

Investigation note for:

`app/(protected)/library-study/kanji/page.tsx`

## Current Status

No fix has been applied yet.

This note captures the suspected cause of the `市` card mismatch so it is not forgotten.

## Reported Bad Behavior

Bad:
* `市` + reading `いち` + meaning `city`

Correct:
* `市【いち】` should show market/fair
* `市【し】` should show city/municipality

Jisho treats these as separate entries, not one entry with two readings.

## Likely Cause

The teacher queue display appears correct.

The likely problem is in Library Study kanji card/session identity. Some kanji-study logic appears to collapse cards by surface/kanji only, which can shadow same-surface entries with different readings.

Suspicious areas:
* `selectOneCardPerSourceWordForDay`
* `selectOneCardPerKanji`
* `studiedTodayWords`
* today study event loading
* `markCardStudiedToday`

## Identity Rule To Use

Preferred identity order:
1. `vocabulary_cache_id` when available
2. `surface + reading`
3. surface/kanji only as a fallback when no reading exists

Do not use surface-only identity for homographs like:
* `市【いち】`
* `市【し】`

## First Safe Fix

In `app/(protected)/library-study/kanji/page.tsx`:

* add `vocabularyCacheId` or equivalent stable identity to `QuizCard`
* add a small card identity helper
* replace surface-only daily/session keys with the helper
* load today study events with enough data to rebuild the same identity
* update `markCardStudiedToday` to use the same identity
* review whether `selectOneCardPerKanji` should still collapse by kanji for daily deck selection

## Things That Look Safer

These areas did not look like the immediate source of this mismatch during the investigation:

* `vocabulary_kanji_map` generation uses `vocabulary_cache_id`
* Library Study color/status lookup uses `surface + reading`
* Ability Check / normal Library Study card identity uses `surface + reading`
* SQL summary identity uses `surface + reading`
* kanji card render displays the `sourceMeaning` already attached to the card

## Do Not Do Accidentally

Do not mark the report resolved until the kanji study card behavior is fixed and verified.

Do not change teacher queue display as part of the first fix unless a separate issue is found there.
