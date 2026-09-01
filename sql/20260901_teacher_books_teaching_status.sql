-- Phase 1: canonical teacher workflow status.
--
-- This separates teaching workflow from assessment/fit fields:
--   teacher_books.teaching_status
--
-- Legacy fields retained:
--   teacher_books.teacher_use_status, teacher_jlpt_difficulty, teaching_suitability

alter table public.teacher_books
  add column if not exists teaching_status text;

alter table public.teacher_books
  drop constraint if exists teacher_books_teaching_status_check;

alter table public.teacher_books
  add constraint teacher_books_teaching_status_check
  check (
    teaching_status is null
    or teaching_status in (
      'considering',
      'currently_teaching',
      'previously_taught',
      'not_for_teaching'
    )
  );

update public.teacher_books
set teaching_status = case
  when teacher_use_status = 'want_to_test' then 'considering'
  when teacher_use_status in ('testing', 'currently_using') then 'currently_teaching'
  when teacher_use_status = 'do_not_use' then 'not_for_teaching'
  else teaching_status
end
where teaching_status is null
  and teacher_use_status in (
    'want_to_test',
    'testing',
    'currently_using',
    'do_not_use'
  );

-- Devon-confirmed workflow overrides. These target deterministic
-- teacher_books rows and do not merge/delete duplicate records.
update public.teacher_books
set teaching_status = 'currently_teaching'
where id = '674a2b47-1b37-4613-ad46-21d280fa9626';

update public.teacher_books
set teaching_status = 'considering'
where id in (
  '6952baa3-1cc5-42d0-9365-6d9e9f130652',
  'dfdf32d2-32bc-4847-9746-e1595c432f84',
  'faf91c8a-2c66-4880-9a5b-971d76d6ecca'
);

update public.teacher_books
set teaching_status = 'not_for_teaching'
where id = '0f110ab0-440c-4b26-9505-08de9f817ef9';

create index if not exists teacher_books_teacher_teaching_status_idx
  on public.teacher_books (teacher_id, teaching_status, updated_at desc);

comment on column public.teacher_books.teaching_status is
  'Canonical teacher workflow status. Null means not assessed. Separate from teacher_jlpt_difficulty and teaching_suitability.';
