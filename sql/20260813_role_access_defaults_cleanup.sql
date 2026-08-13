-- MEKURU role/access defaults cleanup.
--
-- Intent:
-- - New ordinary users should default to role = 'member'.
-- - New users should default to app_access_type = 'free'.
-- - Existing legacy app_access_type values are entitlements and must not be changed.
-- - Existing real students should keep role = 'student' when they have any
--   teacher_students relationship.
--
-- Suggested preflight checks:
-- select role, count(*) from public.profiles group by role order by role;
-- select app_access_type, count(*) from public.profiles group by app_access_type order by app_access_type;
-- select count(*) as unlinked_student_profiles
-- from public.profiles p
-- where p.role = 'student'
--   and not exists (
--     select 1
--     from public.teacher_students ts
--     where ts.student_id = p.id
--   );
-- select count(*) as linked_student_profiles
-- from public.profiles p
-- where p.role = 'student'
--   and exists (
--     select 1
--     from public.teacher_students ts
--     where ts.student_id = p.id
--   );

begin;

alter table public.profiles
  alter column role set default 'member';

alter table public.profiles
  alter column app_access_type set default 'free';

update public.profiles p
set role = 'member'
where p.role = 'student'
  and not exists (
    select 1
    from public.teacher_students ts
    where ts.student_id = p.id
  );

commit;

-- Suggested postflight checks:
-- select role, count(*) from public.profiles group by role order by role;
-- select app_access_type, count(*) from public.profiles group by app_access_type order by app_access_type;
-- select count(*) as remaining_unlinked_student_profiles
-- from public.profiles p
-- where p.role = 'student'
--   and not exists (
--     select 1
--     from public.teacher_students ts
--     where ts.student_id = p.id
--   );
-- select column_name, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'profiles'
--   and column_name in ('role', 'app_access_type')
-- order by column_name;
