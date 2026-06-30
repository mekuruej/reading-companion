# Advanced Word Sky Levels

## Current decision

Word Sky is intentionally capped at JLPT N5-N3 so the shared pool feels motivating and approachable. N2, N1, non-JLPT, and obscure words can still live in the shared vocabulary cache and normal book-study flows, but they should not appear in the default Word Sky pool.

## Future idea

Allow advanced learners to opt into harder Word Sky words, such as N2 and possibly N1, without changing the default experience for most users.

## Possible behavior

- Default Word Sky: N5, N4, N3 only.
- Advanced Word Sky: optional N2 pool for learners marked advanced or N1+.
- Expert/experimental pool: optional N1 or non-JLPT words only if the learner explicitly chooses it.
- Teacher override: a teacher or super teacher could enable harder Word Sky levels for a linked student.

## Data and access questions

- Where should learner level live: profile, learning settings, teacher assignment, or a dedicated study-preferences table?
- Should advanced access be automatic from a learner's public JLPT/profile level, or manually enabled?
- Should N2/N1 words come from `word_sky_starter_words`, personal library summaries, or both?
- Should the user interface show a separate advanced toggle, or quietly widen the pool for eligible learners?

## Implementation notes

- Keep the default shared helper in `lib/wordSkyLevels.ts` conservative.
- Add a separate advanced-level helper rather than expanding the default constant.
- Update `get_word_sky_pool` to accept an optional level policy or create a second RPC for advanced pools.
- Keep super-teacher approval guarded so harder words do not accidentally enter the default starter pool.
