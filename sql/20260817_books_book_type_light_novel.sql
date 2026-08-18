-- Keep the books.book_type constraint aligned with the app's shared book type list.
-- The UI uses light_novel as the canonical value for Light Novel.

alter table public.books
  drop constraint if exists books_book_type_check;

alter table public.books
  add constraint books_book_type_check
  check (
    book_type is null
    or book_type in (
      'picture_book',
      'early_reader',
      'chapter_book',
      'middle_grade',
      'ya',
      'novel',
      'light_novel',
      'short_story',
      'manga',
      'nonfiction',
      'essay',
      'memoir',
      'textbook',
      'other'
    )
  );
