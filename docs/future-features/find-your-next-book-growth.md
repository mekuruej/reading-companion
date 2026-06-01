# Find Your Next Book Growth Notes

## Current Direction

Find Your Next Book now has a separate anonymous recommendation signal source, so it can grow without reading directly from private `user_books` rows.

As more readers rate the same books, the page should keep the book-level browsing experience clear and avoid letting individual reader rows take over the page.

## Near-Term UX Improvements

A. Add Book Title / Author Search
- Add a search input above or beside the existing filters.
- Search should match book title and author.
- Search should work together with reader level, book type, and sort.
- This should be a low-risk visual/filtering improvement only.

B. Keep Average Ratings Prominent
- Book cards should lead with cover, title, author, book type, and average ratings.
- Average ratings should remain visible even when individual reader details are collapsed.
- The average area should stay the main scanning surface for finding a good next book.

C. Collapse Individual Reader Details
- If a book has many reader ratings, show only a small preview by default.
- A good starting rule: show the first 2 reader rows, then a control such as `Show 8 reader ratings`.
- The same control should collapse them again.
- Keep difficulty and entertainment rating columns aligned when expanded.

D. Keep Reader Advice Behind Expansion
- Reader advice is useful, but it can make cards tall.
- In collapsed mode, prioritize reader level plus compact ratings.
- Show advice inside expanded reader details.

## Later Considerations

- If the community grows, consider showing averages only after 3 or more ratings for confidence.
- For now, showing averages at 2 ratings is useful because it makes the feature feel alive and may motivate readers to add ratings.
- Consider a teacher/admin moderation path for hiding a recommendation signal if needed later.

## Status

Not started. Current page is stable for early usage; these notes are for scaling the browsing experience as ratings increase.
