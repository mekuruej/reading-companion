# Curiosity Reading Lookup Flow Notes

## Context

These notes come from first real iPad use of Curiosity Reading, but the improvements apply across devices. The current lookup tools work, but the helper panels can stay open too long and make it harder to see the actual rapid search results, especially on smaller or touch screens.

## Future UX Improvements

A. Clear Helper Inputs After Use
- When the user taps `Use this word`, clear the Build a Word input after copying it into Rapid Search.
- When the user taps `Use this kanji`, clear the Kanji Lookup input after using it.
- This should make the tool feel like each helper action has completed.

B. Kanji Lookup to Build a Word Flow
- The current behavior where `Use this kanji` moves the kanji into Build a Word feels useful.
- Keep this direction as the default candidate flow.
- Open question: should `Use this kanji` offer two actions?
  - Move to Build a Word
  - Send directly to Rapid Search
- For early cleanup, the simpler version is probably best: `Use this kanji` moves to Build a Word.

C. Build a Word to Rapid Search Flow
- `Use this word` should copy the built word into Rapid Search.
- After the word is sent to Rapid Search, collapse the helper/search-building area again.
- Anything sent into Build a Word from Kanji Lookup should also collapse the Kanji Lookup panel so the user can see the next useful area.

D. Collapse Helper Panels After Use
- Keeping Build a Word / Kanji Lookup open can push the real results too far down.
- After a helper action completes, collapse the helper panels so the search results are easier to see.
- The user can reopen the helper tools if needed.

E. Kanji Lookup Should Prioritize Stroke Count
- The Kanji Lookup tool should stay a stricter stroke-count lookup.
- “Common kanji” ordering is not reliable enough for this use case.
- Stroke count should be the main path because the reader is likely looking at an unknown character visually.
- The current shared `KanjiComponentLookup` now sorts radical/component choices by stroke count only.
- The component grid now shows visible stroke-count number markers so readers can scan it quickly, similar to Jisho.
- Component stroke metadata currently covers all generated KRADFILE components used by the app.
- Known checked component counts include `十 = 2`, `辶 = 3`, and `罒 = 5`.
- The numbers should stay large enough to scan quickly without crowding the search results.

F. Possible Stroke Lookup Refinements
- Open design question from iPad use: should the Kanji Lookup have multiple stroke-count support options?
- Possible future directions:
  - exact stroke count
  - nearby stroke counts, such as one fewer / one more
  - grouped number ranges if the full grid feels too large
  - simple radical or shape hints later, if needed
- Add true stroke-count metadata for result kanji themselves, then sort matching kanji by actual kanji stroke count instead of neutral Japanese locale order.
- Keep this lightweight. The immediate need is better stroke-count lookup, not a full kanji dictionary redesign.

## Status

Partially implemented.

- Done: shared Add Word / Curiosity Reading kanji component choices are stroke-count ordered.
- Done: visible stroke-count markers appear in the component grid.
- Done: previous learner/commonness ordering was removed from the component lookup.
- Remaining: result kanji need real stroke-count metadata before they can be sorted by stroke count without guessing.
- Remaining: helper panel cleanup still needs the separate “clear/collapse after use” work above.
