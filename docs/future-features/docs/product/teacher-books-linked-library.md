# Teacher Books + My Mekuru Library

Core rule:
Every Teacher Book has a linked user_books record.

User-facing model:
- My Mekuru Library is the user's bookshelf and reading history.
- Teacher Books are books with teacher workspaces.
- Teacher books are worked on in Teacher Workspace.
- My Mekuru Library shows a Reading Snapshot for teacher-linked books.

Navigation:
- My Mekuru Library → normal book → Book Hub
- My Mekuru Library → teacher book → Reading Snapshot → Teacher Workspace
- Teacher Books → Teacher Workspace

Data rule:
- Reading sessions, progress, saved words, and study history belong to the linked user_book.
- Teacher prep, follow-along items, phrases, and teaching notes belong to teacher tables.
- If teacher access is removed, the user_book remains available in My Mekuru Library.
- Teacher tools become unavailable.