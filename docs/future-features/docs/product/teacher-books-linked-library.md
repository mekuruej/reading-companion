# Teacher Books + My Mekuru Library

## Core rule

- [x] Every Teacher Book has a linked `user_books` record.

Status: **Foundation finished.**  
`teacher_books.user_book_id` now exists, and your existing Teacher Books are linked to matching `user_books` rows.

---

## User-facing model

- [x] My Mekuru Library is the user's bookshelf and reading history.
- [x] Teacher Books are books with teacher workspaces.
- [ ] Teacher books are worked on in Teacher Workspace.
- [ ] My Mekuru Library shows a Reading Snapshot for teacher-linked books.

Notes:
- The naming/model is decided.
- The actual **Teacher Book Workspace** page is not built yet.
- The **Reading Snapshot** page is not built yet.

---

## Navigation

- [x] My Mekuru Library → normal book → Book Hub
- [ ] My Mekuru Library → teacher book → Reading Snapshot → Teacher Workspace
- [ ] Teacher Books → Teacher Workspace

Notes:
- Normal book navigation already exists.
- Teacher-linked book routing from My Mekuru Library still needs to be built.
- Teacher Books currently still open the existing teacher prep/follow-along area, not the new Teacher Book Workspace.

---

## Data rule

- [~] Reading sessions, progress, saved words, and study history belong to the linked `user_book`.
- [x] Teacher prep, follow-along items, phrases, and teaching notes belong to teacher tables.
- [x] If teacher access is removed, the `user_book` remains available in My Mekuru Library.
- [ ] Teacher tools become unavailable.

Notes:
- The linked `user_book` foundation is finished.
- Existing teacher prep still belongs to `teacher_book_items`, which is correct.
- Reader tools from Teacher Books are not connected yet, so timer/saved vocab/study history from the Teacher side do not fully flow through the linked `user_book` yet.
- Role-change behavior is architecturally supported, but the UI/access handling has not been built/tested yet.

Finished:
- teacher_books now link to user_books
- existing Teacher Books were backfilled
- Teacher Books / My Mekuru Library data foundation is in place
- normal Book Hub simplification pass is done

Next:
- build Teacher Book Workspace page
- link existing reader tools using teacher_books.user_book_id
- later build Reading Snapshot from My Mekuru Library