alter table public.user_book_chapter_summaries
  alter column chapter_number type numeric
  using chapter_number::numeric;
