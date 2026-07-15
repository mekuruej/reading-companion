-- Add optional total count for books in a series.
--
-- books.series_number stores this book's position, such as volume 1.
-- books.series_total stores the total number of books/volumes in the series
-- when that is useful and known.

alter table public.books
add column if not exists series_total integer;

alter table public.books
drop constraint if exists books_series_total_positive;

alter table public.books
add constraint books_series_total_positive
  check (series_total is null or series_total > 0);

comment on column public.books.series_total is
  'Optional total number of books or volumes in the series, such as 12 for volume 1 of a 12-volume manga series.';
