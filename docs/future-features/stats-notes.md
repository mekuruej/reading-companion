## Future UX Question: Recent vs. All-Time Vocabulary Lists

The Vocabulary Stats page currently has a section labeled something like:

- `Recently saved words — All Reading`

This may need clearer separation between two different ideas:

1. **Recently Saved Words**
   - A time-sensitive list.
   - Useful for showing the newest words the learner has added.
   - Should probably stay recent/current, maybe filtered by the selected book category.

2. **All-Time Saved Words**
   - A broader historical list.
   - Useful for showing long-term vocabulary growth or the learner’s full saved-word history.
   - Could be a separate section, tab, or link rather than replacing the recent list.

Possible future labels:

- `Recently Saved Words`
- `All-Time Saved Words`
- `Saved Word History`
- `Words Saved in This Category`

Question to resolve later:

Should Vocabulary Stats show both a recent saved-word section and an all-time saved-word section, or should “all-time” live in a separate Word History page?

## Related UX Question: Word History and Most-Looked-Up Words

For a future Word History / vocabulary history view, “most looked up word” may need a time filter.

Reason:

If “most looked up” is all-time only, the same common high-frequency words may stay at the top forever and the stat may stop feeling interesting.

Possible approach:

- Default “Most Looked Up” to a recent time window, such as:
  - This month
  - Past 90 days
  - Past year
- Optionally allow an “All time” view.
- Make the label clear:
  - `Most Looked Up This Month`
  - `Most Looked Up Recently`
  - `Most Looked Up All Time`

This would make Word History feel more alive and prevent old lookup habits from permanently dominating the page.

## Future Performance / UX Note: Vocabulary Stats Data Scope

The Vocabulary Stats page currently appears to work from broad/all-time saved-word, reading-session, and study-event data for the selected book category.

This is acceptable for now, but may become slow for advanced readers or long-term users with thousands of saved words and many study events.

Future direction:

- Consider making Vocabulary Stats default to a recent time window such as this month, past 90 days, or past year.
- Keep “All time” available, but avoid making it the only/default view if performance or usefulness becomes an issue.
- Consider moving full saved-word browsing/searching to a dedicated Word History page.
- Consider adding cached summary tables for monthly vocabulary stats, book-level vocabulary totals, and study signals.

Related Word History decision:

- “Most Looked Up” should probably be time-filtered by default.
- If it is all-time only, the same common/high-frequency words may dominate forever.
- Possible labels:
  - Most Looked Up This Month
  - Most Looked Up Recently
  - Most Looked Up All Time

  ## Future UX Note: Vocabulary Rhythm Color Intensity

The Vocabulary rhythm calendar appears to use stronger/darker colors for higher activity days.

Example:

- Blue = studied
- Darker blue = studied more / higher study volume

The current legend explains the activity type, but not the color intensity.

Future improvement:

- Add a small note near the legend:
  - “Darker colors mean more activity that day.”
- Or add a tiny intensity legend:
  - light = some activity
  - dark = more activity

This would make the dark blue / dark orange / dark purple days easier to understand.