-- MEKURU app_access_type canonicalization.
--
-- Canonical model:
-- - role remains account identity / staff-facing role.
-- - app_access_type is product entitlement only.
-- - Canonical app_access_type values are:
--   free, trial, reading_access, lesson_access, inactive.
--
-- Safety note:
-- Legacy app_access_type='student' rows are classified in the explicit order
-- below. Anything still carrying the legacy student entitlement after those
-- classifications fails the migration rather than being guessed.

begin;

alter table public.profiles
  drop constraint if exists profiles_app_access_type_check;

alter table public.profiles
  alter column role set default 'member',
  alter column app_access_type set default 'free',
  alter column app_access_expires_at drop default,
  alter column trial_started_at drop default;

update public.profiles
set role = 'member'
where role is null;

update public.profiles
set
  app_access_type = 'free',
  app_access_expires_at = null,
  trial_started_at = null
where app_access_type is null
   or btrim(app_access_type) = '';

-- DEMO4 is the permanent active-trial fixture. Preserve its far-future expiry.
update public.profiles
set
  role = 'member',
  app_access_type = 'trial',
  trial_started_at = coalesce(trial_started_at, now())
where id = '787a392a-cf91-462f-8007-bd64fd48718d'::uuid
  and app_access_type = 'student';

-- Explicit independent legacy Reading Access members. These are not lesson
-- access, even if historical teacher_students rows exist.
update public.profiles
set app_access_type = 'reading_access'
where app_access_type = 'student'
  and lower(coalesce(username, '')) in ('fleurogura', 'bobby', 'stasha');

-- Staff teacher/admin privileges are derived from role/is_super_teacher. Their
-- baseline product entitlement should still be Reading Access.
update public.profiles
set
  app_access_type = 'reading_access',
  app_access_expires_at = null,
  trial_started_at = null
where app_access_type = 'student'
  and (
    role in ('teacher', 'super_teacher', 'admin')
    or coalesce(is_super_teacher, false) = true
  );

-- Active teacher-linked learners receive lesson product entitlement. The
-- teacher/student authorization relationship itself remains teacher_students.
update public.profiles p
set app_access_type = 'lesson_access'
where p.app_access_type = 'student'
  and exists (
    select 1
    from public.teacher_students ts
    where ts.student_id = p.id
      and ts.archived_at is null
  );

-- Do not guess any remaining legacy student entitlement rows.
do $$
declare
  remaining_student_rows text;
begin
  select string_agg(coalesce(username, id::text), ', ' order by coalesce(username, id::text))
  into remaining_student_rows
  from public.profiles
  where app_access_type = 'student';

  if remaining_student_rows is not null then
    raise exception
      'Unclassified legacy student entitlement rows remain after explicit and active teacher-linked classification: %',
      remaining_student_rows;
  end if;
end $$;

-- Fail rather than silently normalize unknown or unsupported entitlement values.
do $$
declare
  unsupported_rows text;
begin
  select string_agg(
    format('%s=%s', coalesce(username, id::text), app_access_type),
    ', ' order by coalesce(username, id::text)
  )
  into unsupported_rows
  from public.profiles
  where app_access_type not in (
    'free',
    'trial',
    'reading_access',
    'lesson_access',
    'inactive'
  );

  if unsupported_rows is not null then
    raise exception
      'Unsupported app_access_type values remain after canonicalization: %',
      unsupported_rows;
  end if;
end $$;

alter table public.profiles
  alter column app_access_type set not null;

alter table public.profiles
  add constraint profiles_app_access_type_check
  check (
    app_access_type in (
      'free',
      'trial',
      'reading_access',
      'lesson_access',
      'inactive'
    )
  );

commit;
