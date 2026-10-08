begin;

-- Private audit metadata for permanent complimentary access. Entitlement remains
-- profiles.app_access_type='reading_access' with no expiry or Stripe subscription.
create table if not exists public.complimentary_legacy_access_grants (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reason text not null,
  previous_app_access_type text not null,
  previous_app_access_expires_at timestamptz,
  previous_trial_started_at timestamptz,
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  revoked_by uuid references public.profiles(id),
  revoked_at timestamptz
);

alter table public.complimentary_legacy_access_grants enable row level security;
revoke all on public.complimentary_legacy_access_grants from public, anon, authenticated;
grant select, insert, update, delete on public.complimentary_legacy_access_grants to service_role;

create or replace function public.grant_complimentary_legacy_access(
  p_user_id uuid,
  p_reason text,
  p_granted_by uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles%rowtype;
  existing public.complimentary_legacy_access_grants%rowtype;
  normalized_reason text := btrim(coalesce(p_reason, ''));
begin
  if normalized_reason = '' or length(normalized_reason) > 500 then
    raise exception 'A reason of 1 to 500 characters is required.' using errcode = '22023';
  end if;

  select * into target from public.profiles where id = p_user_id for update;
  if not found then raise exception 'User profile not found.' using errcode = 'P0002'; end if;
  if target.id = p_granted_by then raise exception 'You cannot grant this access to yourself.' using errcode = '42501'; end if;
  if target.role in ('teacher', 'super_teacher', 'admin') or coalesce(target.is_super_teacher, false) then
    raise exception 'Staff accounts use staff access.' using errcode = '22023';
  end if;
  if target.app_access_type = 'inactive' then
    raise exception 'Inactive access must be changed through account administration.' using errcode = '22023';
  end if;
  if target.app_access_type = 'lesson_access' then
    raise exception 'Lesson access cannot be replaced by complimentary legacy access.' using errcode = '22023';
  end if;
  if target.app_access_subscription_id is not null then
    raise exception 'An account with a linked subscription cannot receive this grant.' using errcode = '22023';
  end if;
  if target.app_access_type not in ('free', 'trial', 'reading_access') then
    raise exception 'This access type cannot be replaced by complimentary legacy access.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.stripe_subscriptions s
    where s.user_id = p_user_id
      and (s.status not in ('canceled', 'incomplete_expired') or s.paid_through > now())
  ) then
    raise exception 'An existing Stripe subscription must be resolved first.' using errcode = '22023';
  end if;

  update public.profiles
  set app_access_type = 'reading_access',
      app_access_expires_at = null,
      trial_started_at = null,
      app_access_subscription_id = null
  where id = p_user_id;

  select * into existing from public.complimentary_legacy_access_grants
  where user_id = p_user_id for update;
  if not found then
    insert into public.complimentary_legacy_access_grants (
      user_id, reason, previous_app_access_type, previous_app_access_expires_at,
      previous_trial_started_at, granted_by, updated_by
    ) values (
      p_user_id, normalized_reason, target.app_access_type, target.app_access_expires_at,
      target.trial_started_at, p_granted_by, p_granted_by
    );
  elsif existing.revoked_at is not null then
    update public.complimentary_legacy_access_grants
    set reason = normalized_reason,
        previous_app_access_type = target.app_access_type,
        previous_app_access_expires_at = target.app_access_expires_at,
        previous_trial_started_at = target.trial_started_at,
        granted_by = p_granted_by,
        granted_at = now(),
        updated_by = p_granted_by,
        updated_at = now(),
        revoked_by = null,
        revoked_at = null
    where user_id = p_user_id;
  else
    update public.complimentary_legacy_access_grants
    set reason = normalized_reason, updated_by = p_granted_by, updated_at = now()
    where user_id = p_user_id;
  end if;
end;
$$;

create or replace function public.revoke_complimentary_legacy_access(
  p_user_id uuid,
  p_revoked_by uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.profiles%rowtype;
  grant_row public.complimentary_legacy_access_grants%rowtype;
begin
  select * into target from public.profiles where id = p_user_id for update;
  if not found then raise exception 'User profile not found.' using errcode = 'P0002'; end if;

  select * into grant_row from public.complimentary_legacy_access_grants
  where user_id = p_user_id and revoked_at is null for update;
  if not found then raise exception 'No active complimentary legacy grant exists.' using errcode = 'P0002'; end if;
  update public.complimentary_legacy_access_grants
  set revoked_by = p_revoked_by, revoked_at = now(), updated_by = p_revoked_by, updated_at = now()
  where user_id = p_user_id and revoked_at is null;

  -- Restore the exact previous access state, without downgrading a later change.
  if target.app_access_type = 'reading_access'
    and target.app_access_expires_at is null
    and target.trial_started_at is null
    and target.app_access_subscription_id is null
    and not exists (
      select 1 from public.stripe_subscriptions s
      where s.user_id = p_user_id
        and (s.status not in ('canceled', 'incomplete_expired') or s.paid_through > now())
    ) then
    update public.profiles
    set app_access_type = grant_row.previous_app_access_type,
        app_access_expires_at = grant_row.previous_app_access_expires_at,
        trial_started_at = grant_row.previous_trial_started_at
    where id = p_user_id;
  end if;
end;
$$;

revoke all on function public.grant_complimentary_legacy_access(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.revoke_complimentary_legacy_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.grant_complimentary_legacy_access(uuid, text, uuid) to service_role;
grant execute on function public.revoke_complimentary_legacy_access(uuid, uuid) to service_role;

comment on table public.complimentary_legacy_access_grants is
  'Internal-only reason and audit metadata for permanent complimentary reading_access grants.';

commit;
