-- Optional stopping point, protected by the existing session ownership policies.
alter table public.user_book_reading_sessions
  add column if not exists ending_phrase text
  check (char_length(ending_phrase) <= 500);
comment on column public.user_book_reading_sessions.ending_phrase
  is 'Optional last phrase read or heard when finishing a timed session.';
