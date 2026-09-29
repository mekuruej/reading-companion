# Saved senses and study progress

Library Study previously used the normalized headword/reading `study_identity_key` for deck grouping and always wrote `definition_key = ''`. Although the database already had a unique `(user_id, study_identity_key, definition_key)` constraint, different saved meanings shared progress. Book flashcards also deduplicated by headword and accepted any dictionary meaning as an answer.

Study now groups only actual saved `user_book_words` encounters by the existing headword identity plus selected `meaning_choice_index`. Index 0 identifies Definition 1, index 1 Definition 2, and so on. Missing indices retain the existing primary-definition interpretation. Dictionary alternatives do not automatically become study cards. Editing the saved selection moves that encounter into the selected sense group; progress for the previous sense is not copied or renamed.

`lib/studySenseIdentity.ts` owns composite study keys. Headword and reading remain shared; no lexical records or copies are created. Meaning, encounter IDs, associated book/context records and flags come only from the selected sense's saved encounters. Existing book study events retain their encounter ID and saved meaning snapshot. Gate attempts, failure/pass timestamps, holds, last study time and mastery now persist under the selected sense's progress row.

For compatibility, the existing blank definition key remains Definition 1's storage key. Definition 2 and above use their number as a string. Existing word-level progress and Word Sky claims apply only to the primary sense. They are never copied to secondary senses. There is no migration or schema change: the existing unique constraint and owner-only RLS already support these rows. Old word-level history cannot be reliably divided retrospectively into senses.

Ability Check, Library Review, their session deduplication/seen state, and book flashcard decks keep senses separate. Book color requests include the sense number. Book meaning checks accept the saved meaning, not other entries from the dictionary alternatives array. The existing review-stage calculation is unchanged. Definition accents remain a separate presentation mapping.

Word summaries, saved-word totals, unique-vocabulary totals and lexical records are unchanged. Legacy word-level color dashboards explicitly use the primary progress row so another sense cannot overwrite it unpredictably. These are primary-sense/word summaries, not an assertion that every saved sense is mastered. Study session and filter counts count cards. Study decks use paginated saved encounters rather than the word-level summary table, which intentionally collapses senses.

Validation: `node --test tests/study-sense-independence.test.mjs` exercises saved-sense grouping, daily deduplication, seen state, gate saves/reloads, Red 2 isolation, book color lookup and meaning-answer isolation. No authenticated browser or live-database verification is included in these tests.
