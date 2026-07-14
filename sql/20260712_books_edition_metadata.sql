-- Explicit edition metadata for shared book records.
--
-- MEKURU treats one books row as one specific edition / pagination system.
-- These fields help identify the physical or digital edition without adding a
-- separate work/edition hierarchy.

alter table public.books
  add column if not exists edition_format text,
  add column if not exists edition_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'books_edition_format_check'
      and conrelid = 'public.books'::regclass
  ) then
    alter table public.books
      add constraint books_edition_format_check
      check (
        edition_format is null
        or edition_format in (
          'bunko',
          'tankobon_hardcover',
          'tankobon_softcover',
          'paperback',
          'hardcover',
          'ebook',
          'other'
        )
      );
  end if;
end $$;

comment on column public.books.edition_format is
  'Specific book edition format. One books row represents one edition / pagination system.';

comment on column public.books.edition_note is
  'Optional details that identify this specific edition, such as US edition, UK edition, revised edition, or no-ISBN source notes.';
