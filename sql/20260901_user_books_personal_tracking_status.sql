-- Phase 1: explicit personal reading tracking for user_books.
--
-- Canonical after this migration:
--   user_books.personal_tracking_status
--
-- Compatibility fields retained:
--   user_books.status, started_at, finished_at, dnf_at

alter table public.user_books
  add column if not exists personal_tracking_status text;

alter table public.user_books
  drop constraint if exists user_books_personal_tracking_status_check;

alter table public.user_books
  add constraint user_books_personal_tracking_status_check
  check (
    personal_tracking_status is null or
    personal_tracking_status in (
      'not_tracking',
      'want_to_read',
      'reading',
      'finished',
      'dnf'
    )
  );

update public.user_books
set personal_tracking_status = case
  when dnf_at is not null or status = 'did_not_finish' then 'dnf'
  when finished_at is not null or status = 'finished' then 'finished'
  when status = 'reading' then 'reading'
  when status = 'what_to_read' then 'want_to_read'
  when started_at is not null then 'reading'
  else 'want_to_read'
end
where personal_tracking_status is null
   or personal_tracking_status not in (
     'not_tracking',
     'want_to_read',
     'reading',
     'finished',
     'dnf'
   );

-- Devon-confirmed teaching-only override.
update public.user_books
set personal_tracking_status = 'not_tracking'
where id = '9c030ee6-e1a7-4973-911d-72f74c910a78';

-- Confirmed teaching-only unlinked teacher_books that should receive/link
-- teacher-owned workspaces without artificial personal reading dates.
with confirmed_unlinked_teacher_books(teacher_book_id) as (
  values
    ('dfdf32d2-32bc-4847-9746-e1595c432f84'::uuid),
    ('faf91c8a-2c66-4880-9a5b-971d76d6ecca'::uuid)
),
target_teacher_books as (
  select tb.id, tb.teacher_id, tb.book_id
  from public.teacher_books tb
  join confirmed_unlinked_teacher_books confirmed
    on confirmed.teacher_book_id = tb.id
  where tb.user_book_id is null
),
inserted_user_books as (
  insert into public.user_books (
    user_id,
    book_id,
    status,
    personal_tracking_status
  )
  select
    target.teacher_id,
    target.book_id,
    'what_to_read',
    'not_tracking'
  from target_teacher_books target
  where not exists (
    select 1
    from public.user_books existing
    where existing.user_id = target.teacher_id
      and existing.book_id = target.book_id
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
matches as (
  select distinct on (target.id)
    target.id as teacher_book_id,
    candidate.id as user_book_id
  from target_teacher_books target
  join candidate_user_books candidate
    on candidate.user_id = target.teacher_id
   and candidate.book_id = target.book_id
  order by target.id, candidate.created_at nulls last, candidate.id
)
update public.teacher_books tb
set user_book_id = matches.user_book_id
from matches
where tb.id = matches.teacher_book_id
  and tb.user_book_id is null;

with confirmed_unlinked_teacher_books(teacher_book_id) as (
  values
    ('dfdf32d2-32bc-4847-9746-e1595c432f84'::uuid),
    ('faf91c8a-2c66-4880-9a5b-971d76d6ecca'::uuid)
)
update public.user_books ub
set personal_tracking_status = 'not_tracking'
from public.teacher_books tb
join confirmed_unlinked_teacher_books confirmed
  on confirmed.teacher_book_id = tb.id
where tb.user_book_id = ub.id;

alter table public.user_books
  alter column personal_tracking_status set default 'want_to_read';

update public.user_books
set personal_tracking_status = 'want_to_read'
where personal_tracking_status is null;

alter table public.user_books
  alter column personal_tracking_status set not null;

comment on column public.user_books.personal_tracking_status is
  'Canonical personal reading tracking state. Legacy status/date fields remain for compatibility.';
