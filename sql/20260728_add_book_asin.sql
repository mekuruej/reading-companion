-- Add Amazon ASIN as an optional edition identifier.
--
-- One books row represents one specific edition. ASIN is kept separate from
-- ISBN so Kindle, Audible, and other Amazon-specific editions can coexist with
-- print ISBN editions of the same title.

alter table public.books
  add column if not exists asin text;

alter table public.book_requests
  add column if not exists asin text,
  add column if not exists edition_format text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'books_edition_format_check'
      and conrelid = 'public.books'::regclass
  ) then
    alter table public.books
      drop constraint books_edition_format_check;
  end if;

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
        'audiobook',
        'other'
      )
    );
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'book_requests_edition_format_check'
      and conrelid = 'public.book_requests'::regclass
  ) then
    alter table public.book_requests
      add constraint book_requests_edition_format_check
      check (
        edition_format is null
        or edition_format in (
          'bunko',
          'tankobon_hardcover',
          'tankobon_softcover',
          'paperback',
          'hardcover',
          'ebook',
          'audiobook',
          'other'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'books_asin_format_check'
      and conrelid = 'public.books'::regclass
  ) then
    alter table public.books
      add constraint books_asin_format_check
      check (
        asin is null
        or btrim(asin) = ''
        or upper(btrim(asin)) ~ '^[A-Z0-9]{10}$'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'book_requests_asin_format_check'
      and conrelid = 'public.book_requests'::regclass
  ) then
    alter table public.book_requests
      add constraint book_requests_asin_format_check
      check (
        asin is null
        or btrim(asin) = ''
        or upper(btrim(asin)) ~ '^[A-Z0-9]{10}$'
      );
  end if;
end $$;

create unique index if not exists books_asin_unique_ci
  on public.books (upper(btrim(asin)))
  where asin is not null and btrim(asin) <> '';

comment on column public.books.asin is
  'Optional Amazon ASIN for a specific catalog edition. Stored separately from ISBN.';

comment on column public.book_requests.asin is
  'Optional Amazon ASIN supplied with a reader book request.';

comment on column public.book_requests.edition_format is
  'Optional intended edition format supplied with a reader book request.';
