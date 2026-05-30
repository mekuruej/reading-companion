alter table public.user_books
add column if not exists reader_advice text;

comment on column public.user_books.reader_advice is
  'Short anonymous advice from a reader for future readers of the same book.';
