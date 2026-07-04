-- Link Teacher Books to normal My Mekuru Library rows.
--
-- Teacher prep content stays in teacher_book_items, but each teacher_books row
-- can now point at the teacher's user_books row for future reading/study history.

alter table public.teacher_books
  add column if not exists user_book_id uuid references public.user_books(id) on delete set null;

create index if not exists teacher_books_user_book_id_idx
  on public.teacher_books (user_book_id);

comment on column public.teacher_books.user_book_id is
  'Linked My Mekuru Library row for this teacher/book. Teacher prep items remain in teacher_book_items.';

-- First link Teacher Books to existing matching My Mekuru Library rows.
with existing_matches as (
  select distinct on (tb.id)
    tb.id as teacher_book_id,
    ub.id as user_book_id
  from public.teacher_books tb
  join public.user_books ub
    on ub.user_id = tb.teacher_id
   and ub.book_id = tb.book_id
  where tb.user_book_id is null
  order by tb.id, ub.created_at nulls last, ub.id
)
update public.teacher_books tb
set user_book_id = existing_matches.user_book_id
from existing_matches
where tb.id = existing_matches.teacher_book_id
  and tb.user_book_id is null;

-- Create minimal My Mekuru Library rows for any Teacher Books still unlinked,
-- then link them. This mirrors the normal add-book flow: user_id, book_id,
-- and started_at are supplied; all other user_books fields use defaults.
with unlinked as (
  select
    tb.id as teacher_book_id,
    tb.teacher_id,
    tb.book_id
  from public.teacher_books tb
  where tb.user_book_id is null
),
inserted_user_books as (
  insert into public.user_books (user_id, book_id, started_at)
  select
    u.teacher_id,
    u.book_id,
    current_date
  from unlinked u
  where not exists (
    select 1
    from public.user_books ub
    where ub.user_id = u.teacher_id
      and ub.book_id = u.book_id
  )
  returning id, user_id, book_id, created_at
),
candidate_user_books as (
  select id, user_id, book_id, created_at
  from public.user_books

  union all

  select id, user_id, book_id, created_at
  from inserted_user_books
),
new_matches as (
  select distinct on (u.teacher_book_id)
    u.teacher_book_id,
    ub.id as user_book_id
  from unlinked u
  join candidate_user_books ub
    on ub.user_id = u.teacher_id
   and ub.book_id = u.book_id
  order by u.teacher_book_id, ub.created_at nulls last, ub.id
)
update public.teacher_books tb
set user_book_id = new_matches.user_book_id
from new_matches
where tb.id = new_matches.teacher_book_id
  and tb.user_book_id is null;
