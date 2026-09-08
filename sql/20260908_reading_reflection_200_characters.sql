-- Allow shared Reading Reflections up to 200 characters.
-- This widens the existing constraint without changing stored reflections.
begin;

alter table public.book_recommendation_signals
  drop constraint book_recommendation_signals_reader_advice_length,
  add constraint book_recommendation_signals_reader_advice_length
    check (reader_advice is null or char_length(reader_advice) <= 200);

commit;
