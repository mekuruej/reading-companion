alter table public.user_book_characters
  add column if not exists first_seen_location text;

comment on column public.user_book_characters.first_seen_location is
  'Optional flexible location where the reader first noticed this character, such as a page, chapter, percentage, or audiobook marker.';
