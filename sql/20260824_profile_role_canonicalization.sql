-- MEKURU profile role canonicalization.
--
-- Canonical model:
-- - profiles.role is account/staff identity only.
-- - Ordinary learners use role = 'member', including active lesson learners.
-- - Current/former student status comes from teacher_students.
-- - Product entitlement comes from app_access_type.

begin;

alter table public.profiles
  alter column role set default 'member';

update public.profiles
set role = 'member'
where role = 'student';

do $$
declare
  unexpected_roles text;
begin
  select string_agg(distinct role, ', ' order by role)
  into unexpected_roles
  from public.profiles
  where role is not null
    and role not in ('member', 'teacher', 'super_teacher', 'admin');

  if unexpected_roles is not null then
    raise exception
      'Unexpected profile role values remain after student role cleanup: %',
      unexpected_roles;
  end if;
end $$;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role is null
    or role in ('member', 'teacher', 'super_teacher', 'admin')
  );

commit;
