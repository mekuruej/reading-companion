-- Book metadata exceptions for manual/JSL/no-ISBN readers.
--
-- Some legitimate classroom or small-reader books do not have ISBN or
-- publisher metadata. Super teachers need to mark those blanks as intentional
-- without weakening the default checks for normally published books.

alter table public.books
add column if not exists allow_missing_isbn boolean not null default false;

alter table public.books
add column if not exists allow_missing_publisher boolean not null default false;

alter table public.books
add column if not exists missing_info_cleared_at timestamptz;

alter table public.books
add column if not exists missing_info_cleared_by uuid references auth.users(id) on delete set null;

comment on column public.books.allow_missing_isbn is
  'When true, missing ISBN/ISBN-13 should not keep this global book in missing-info queues.';

comment on column public.books.allow_missing_publisher is
  'When true, missing publisher should not keep this global book in missing-info queues.';

comment on column public.books.missing_info_cleared_at is
  'Set when a super teacher manually clears a global book from missing-info attention queues.';

comment on column public.books.missing_info_cleared_by is
  'User who manually cleared the global book from missing-info attention queues.';
