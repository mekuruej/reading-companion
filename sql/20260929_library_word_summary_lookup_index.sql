-- Fix Remove from both timing out while the per-word summary trigger rebuilds
-- encounter summaries. Live EXPLAIN showed 92 trigger calls taking 9.3 seconds.
-- Index the exact immutable identity expression used by the existing refresh
-- function. No deletion logic, ownership checks, triggers or FK actions change.
begin;
set local lock_timeout = '3s';
create index if not exists user_book_words_study_identity_book_idx
  on public.user_book_words (
    public.library_study_identity_key(surface, reading), user_book_id
  );
analyze public.user_book_words;
commit;
