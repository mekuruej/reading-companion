# Future Feature: Reading Support Vocabulary Model

## Purpose

Mekuru needs a clearer vocabulary model for reading support across:

- Japanese reading
- future English Readers
- teacher dictionary-building
- future multilingual support

The goal is to separate the stable study/dictionary entry from the exact form a reader saw in a book. This lets Mekuru support conjugated Japanese forms, English phrasal verbs, teacher-built dictionary entries, and later multilingual reading without breaking the current app.

## Current Compatibility Field: `surface`

`surface` is currently used throughout the app.

In many current flows, `surface` behaves like the base/study/dictionary form, even though the name "surface" usually means the exact form seen in the text.

Do not rename or repurpose `surface` quickly.

For now, `surface` should remain the compatibility field until dependent pages are migrated carefully. Existing pages, study cards, vocabulary lists, cache lookups, kanji-map logic, and saved-word displays may still depend on `surface` behaving the way it does today.

## Base Form vs Encountered Form

`base_form` should mean the dictionary, lemma, or canonical study form.

`encountered_surface` should mean the exact form the reader saw or typed.

`lookup_surface` should mean the text used for dictionary/API lookup. This may be the encountered form, a normalized search form, or the selected dictionary form depending on the flow.

The main study entry should eventually display:

```txt
base_form ?? surface
```

The encountered form should be shown as context only when useful, especially when it differs from the base form.

Examples:

```txt
Base form: 読む
Encountered form: 読まなかった
Form note later: negative past
```

```txt
Base form: 患う
Encountered form: 患っている
Form note later: progressive/result state depending on context
```

```txt
Base form: look after
Encountered form: looked after
Form note later: past tense
```

## Teacher Global Dictionary Entry

Teacher Global Word Entry is a dictionary-building workflow.

The teacher is building clean global/base entries.

`vocabulary_cache.surface` should currently be treated as the canonical/base dictionary form.

The teacher may type either a base form or an encountered form. If the teacher types an encountered form like `患っている`, lookup should eventually behave like Add Word and resolve it to `患う`.

The global dictionary check/save should use the resolved base form. The global dictionary should not store every conjugated or encountered form as a separate entry.

Example:

```txt
Teacher types: 患っている
Lookup resolves to: 患う
Global dictionary check uses: vocabulary_cache.surface = 患う
Stored global dictionary entry: 患う
```

Recommended rule:

```txt
Teacher input can be messy.
Global dictionary storage stays clean.
```

## Student Add Word Flows

Student-facing Add Word flows are different from Teacher Global Word Entry.

Students may type the exact form they see in the book because they may not know the base form.

The app should preserve the original form as `encountered_surface`.

The app should resolve/connect the word to `base_form` and eventually `vocabulary_cache_id`.

For compatibility, `surface` should continue to hold the current base/study form until migration is complete.

Example:

```txt
Student enters: 患っている
encountered_surface: 患っている
base_form: 患う
surface: 患う
vocabulary_cache_id: points to the global 患う entry when available
```

## English Readers Use Case

English Readers is one use case for this model.

English learners may encounter forms like `looked after`, `gave up`, or `was running`.

The reusable entry should remain `look after`, `give up`, or `run`.

English Readers should remain documented separately as a feature in `english-readers.md`.

## Migration Path

Safe migration path:

1. Keep `surface` unchanged as the current compatibility field.
2. Preserve the original typed/book form in `encountered_surface`.
3. Save the selected dictionary/basic form into `base_form`.
4. Save the actual dictionary/API query into `lookup_surface`.
5. Continue writing `surface` as the base/study form until all dependent pages are migrated.
6. Gradually update display surfaces to show `base_form ?? surface` as the main word.
7. Show `encountered_surface` as a small context line only when it differs.
8. Later update identity logic toward `vocabulary_cache_id`, then `base_form + reading`, then `surface + reading` fallback.

## Important Boundary

Do not fix the whole Add Word save flow in one large pass.

Add Word is delicate. Future changes should be small and staged.

Teacher Global Word Entry lookup/save work should not accidentally create user-owned vocabulary entries.

User-owned encountered forms and global dictionary entries are related, but they are not the same thing.
