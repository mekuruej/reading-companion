-- Apply after 20260928_book_reading_experiences.sql.
-- Levels and fit describe the specific reader at the time of this experience.
begin;
alter table public.book_reading_experiences
  add column if not exists reader_level text
    check (reader_level ~ '^Level ([1-9]|10)$'),
  add column if not exists level_fit text
    check (level_fit in ('too_easy', 'good_fit', 'challenging', 'too_difficult'));
comment on column public.book_reading_experiences.reader_level is
  'Optional MEKURU level snapshot for this experience. Independent of subsequent profile level changes.';
comment on column public.book_reading_experiences.level_fit is
  'Optional book fit for this reader in this experience; not the overall book assessment.';
-- The separate level-feedback feature is retired. The owner confirmed there is no data to migrate.
drop table if exists public.book_teaching_reflections;
notify pgrst, 'reload schema';
commit;
