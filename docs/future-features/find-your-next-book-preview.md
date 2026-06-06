### Future Public Website Teaser: Find Your Next Book Snapshot

Idea:

Use the “Find Your Next Book” concept as a public website teaser to show the community value of Mekuru.

Short-term:

Use a static screenshot or designed mockup on the public website. This gives visitors a quick sense of how Mekuru helps learners find books through other learners’ real reading experiences, without adding new public database access during stabilization.

Later:

Build a live public preview section that reads from `public_book_recommendation_signals`, not from private `user_books`.

The public preview may show:

* book cover
* title
* author
* book type
* reader level
* difficulty rating
* entertainment rating
* short anonymous reader advice

The public preview must not show:

* `user_id`
* `user_book_id`
* usernames
* profile links
* private Book Hub links
* saved vocabulary
* reading history
* teacher/student data

Public website behavior:

Cards should link to a waitlist/signup CTA, a public book preview page, or a “Join Mekuru to explore reader-fit recommendations” button.

Logged-in app behavior:

Inside the app, `/discovery/find-books` can keep using the anonymous recommendation signal plus the logged-in user’s own `user_books` match, so books already in the viewer’s library can link to the viewer’s own Book Hub.

Main principle:

The public website teaser should show the value of anonymous reader-fit recommendations while keeping private library data private.