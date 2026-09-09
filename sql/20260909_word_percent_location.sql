-- Keep a word's ebook percentage independently of its actual page number.
-- Existing words retain their page and receive no percentage.
begin;
alter table public.user_book_words
  add column percent_location numeric,
  add constraint user_book_words_percent_location_check
    check (percent_location is null or percent_location between 0 and 100);
commit;
