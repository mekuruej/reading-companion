alter table public.user_book_characters
  add column if not exists first_seen_page_number integer;

comment on column public.user_book_characters.first_seen_page_number is
  'Optional page number where the reader first noticed this character.';
