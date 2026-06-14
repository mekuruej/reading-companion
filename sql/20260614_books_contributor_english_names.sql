-- Store contributor English display names on book records.
-- Shared people.name_en remains the richer linked-record source, but these
-- fields preserve English names for legacy book-only contributor data.

alter table public.books
  add column if not exists author_english_name text,
  add column if not exists translator_english_name text,
  add column if not exists illustrator_english_name text;

update public.books b
set author_english_name = p.name_en
from public.book_contributors bc
join public.people p on p.id = bc.person_id
where bc.book_id = b.id
  and bc.role = 'author'
  and nullif(trim(b.author_english_name), '') is null
  and nullif(trim(p.name_en), '') is not null;

update public.books b
set translator_english_name = p.name_en
from public.book_contributors bc
join public.people p on p.id = bc.person_id
where bc.book_id = b.id
  and bc.role = 'translator'
  and nullif(trim(b.translator_english_name), '') is null
  and nullif(trim(p.name_en), '') is not null;

update public.books b
set illustrator_english_name = p.name_en
from public.book_contributors bc
join public.people p on p.id = bc.person_id
where bc.book_id = b.id
  and bc.role = 'illustrator'
  and nullif(trim(b.illustrator_english_name), '') is null
  and nullif(trim(p.name_en), '') is not null;

comment on column public.books.author_english_name is
  'English display name for the book author when no linked people record is available.';

comment on column public.books.translator_english_name is
  'English display name for the book translator when no linked people record is available.';

comment on column public.books.illustrator_english_name is
  'English display name for the book illustrator when no linked people record is available.';
