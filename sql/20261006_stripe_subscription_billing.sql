-- Apply after existing access/request migrations. No existing entitlement/data is backfilled.
begin;
create table public.stripe_customers (
  customer_id text primary key,
  user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(customer_id, user_id)
);
create table public.stripe_subscriptions (
  subscription_id text primary key,
  user_id uuid not null references public.profiles(id),
  customer_id text not null,
  price_id text not null,
  status text not null default 'pending',
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  paid_through timestamptz,
  ended_at timestamptz,
  review_reason text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(customer_id, user_id) references public.stripe_customers(customer_id, user_id)
);
create index stripe_subscriptions_user on public.stripe_subscriptions(user_id);
create table public.stripe_checkout_attempts (
  reference text primary key,
  user_id uuid not null references public.profiles(id),
  payment_link_id text not null,
  price_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 hour'),
  checkout_session_id text unique,
  subscription_id text unique references public.stripe_subscriptions(subscription_id)
);
create index stripe_checkout_attempts_user on public.stripe_checkout_attempts(user_id);
create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'pending' check(status in ('pending','processed','review')),
  attempts integer not null default 0,
  last_error text,
  last_attempt_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
-- This also acts as a durable retry inbox; retrieve original events from Stripe, not browser data.
create index stripe_webhook_events_pending on public.stripe_webhook_events(received_at) where status='pending';
alter table public.profiles
  add column app_access_subscription_id text references public.stripe_subscriptions(subscription_id),
  add column billing_sync_token uuid,
  add column billing_sync_until timestamptz;

-- Billing tables are server-only. Existing UI obtains a limited status through an authenticated API.
do $$ declare t text; begin
  foreach t in array array['stripe_customers','stripe_subscriptions','stripe_checkout_attempts','stripe_webhook_events'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to service_role',t);
  end loop;
end $$;

-- Profile ownership RLS alone does not prevent users from promoting themselves.
create function public.protect_profile_access_fields() returns trigger
language plpgsql set search_path=public as $$
begin
  if current_user not in ('postgres','supabase_admin','service_role') then
    if tg_op='INSERT' then
      if new.app_access_type is distinct from 'free' or new.app_access_expires_at is not null
        or new.trial_started_at is not null or new.app_access_subscription_id is not null
        or new.billing_sync_token is not null or new.billing_sync_until is not null
        or coalesce(new.role,'member') <> 'member' or coalesce(new.is_super_teacher,false) then
        raise exception 'Access fields are server-managed' using errcode='42501';
      end if;
    elsif new.app_access_type is distinct from old.app_access_type
      or new.app_access_expires_at is distinct from old.app_access_expires_at
      or new.trial_started_at is distinct from old.trial_started_at
      or new.app_access_subscription_id is distinct from old.app_access_subscription_id
      or new.billing_sync_token is distinct from old.billing_sync_token
      or new.billing_sync_until is distinct from old.billing_sync_until
      or new.role is distinct from old.role or new.is_super_teacher is distinct from old.is_super_teacher then
      raise exception 'Access fields are server-managed' using errcode='42501';
    end if;
  end if;
  -- Explicit manual changes take ownership away from Stripe. Setting inactive also wins.
  if tg_op='UPDATE' and old.app_access_subscription_id is not null
    and coalesce(current_setting('mekuru.billing_write',true),'') <> 'on'
    and (new.app_access_type is distinct from old.app_access_type
      or new.app_access_expires_at is distinct from old.app_access_expires_at) then
    new.app_access_subscription_id := null;
  end if;
  return new;
end $$;
create trigger protect_profile_access_fields before insert or update on public.profiles
for each row execute function public.protect_profile_access_fields();

create function public.begin_stripe_checkout(p_user uuid,p_reference text,p_link text,p_price text)
returns text language plpgsql security definer set search_path=public as $$
declare p public.profiles%rowtype; existing text;
begin
  select * into p from public.profiles where id=p_user for update;
  if not found then raise exception 'Profile required' using errcode='P0002'; end if;
  if p.app_access_type='inactive' or p.role in ('teacher','super_teacher','admin') or p.is_super_teacher
    or (p.app_access_type in ('reading_access','lesson_access','student','paid','book_club','full_access')
      and (p.app_access_expires_at is null or p.app_access_expires_at>now())) then
    raise exception 'This account already has access or is inactive' using errcode='P0001';
  end if;
  if exists(select 1 from stripe_subscriptions where user_id=p_user and
    (status not in ('canceled','incomplete_expired') or paid_through>now())) then
    raise exception 'Manage your existing subscription instead' using errcode='P0001';
  end if;
  select reference into existing from stripe_checkout_attempts where user_id=p_user
    and checkout_session_id is null and expires_at>now() and payment_link_id=p_link and price_id=p_price
    order by created_at desc limit 1;
  if existing is not null then return existing; end if;
  insert into stripe_checkout_attempts(reference,user_id,payment_link_id,price_id)
    values(p_reference,p_user,p_link,p_price);
  return p_reference;
end $$;

create function public.bind_stripe_checkout(p_reference text,p_session text,p_subscription text,p_customer text,
  p_link text,p_price text,p_created timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare a stripe_checkout_attempts%rowtype; owner uuid;
begin
  select * into a from stripe_checkout_attempts where reference=p_reference for update;
  if not found then raise exception 'Unknown checkout reference' using errcode='22023'; end if;
  if a.payment_link_id<>p_link or a.price_id<>p_price or p_created<a.created_at-interval '5 seconds'
    or p_created>a.expires_at then raise exception 'Invalid or expired checkout reference' using errcode='22023'; end if;
  if a.checkout_session_id is not null and (a.checkout_session_id<>p_session or a.subscription_id<>p_subscription) then
    raise exception 'Checkout reference already used' using errcode='22023'; end if;
  perform 1 from profiles where id=a.user_id for update;
  insert into stripe_customers(customer_id,user_id) values(p_customer,a.user_id) on conflict do nothing;
  select user_id into owner from stripe_customers where customer_id=p_customer;
  if owner<>a.user_id then raise exception 'Customer ownership conflict' using errcode='22023'; end if;
  insert into stripe_subscriptions(subscription_id,user_id,customer_id,price_id)
    values(p_subscription,a.user_id,p_customer,p_price) on conflict do nothing;
  if not exists(select 1 from stripe_subscriptions where subscription_id=p_subscription
    and user_id=a.user_id and customer_id=p_customer and price_id=p_price) then
    raise exception 'Subscription ownership conflict' using errcode='22023';
  end if;
  update stripe_checkout_attempts set checkout_session_id=p_session,subscription_id=p_subscription where reference=p_reference;
  return a.user_id;
end $$;

create function public.acquire_billing_sync(p_user uuid,p_token uuid) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  update profiles set billing_sync_token=p_token,billing_sync_until=now()+interval '3 minutes'
    where id=p_user and (billing_sync_until is null or billing_sync_until<now());
  return found;
end $$;
create function public.release_billing_sync(p_user uuid,p_token uuid) returns void
language sql security definer set search_path=public as $$
  update profiles set billing_sync_token=null,billing_sync_until=null where id=p_user and billing_sync_token=p_token;
$$;

-- Only a holder of the current unexpired lease can apply a Stripe snapshot.
-- External API retrieval occurs AFTER acquiring the lease, never before it.
create function public.apply_stripe_snapshot(p_user uuid,p_token uuid,p_snapshots jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare p profiles%rowtype; s jsonb; winner stripe_subscriptions%rowtype; problem text;
begin
  select * into p from profiles where id=p_user for update;
  if p.billing_sync_token is distinct from p_token or p.billing_sync_until<=now() then
    raise exception 'Billing lease expired' using errcode='40001';
  end if;
  for s in select * from jsonb_array_elements(p_snapshots) loop
    update stripe_subscriptions set status=s->>'status',cancel_at_period_end=(s->>'cancel_at_period_end')::boolean,
      current_period_end=(s->>'current_period_end')::timestamptz,
      paid_through=(s->>'paid_through')::timestamptz,ended_at=(s->>'ended_at')::timestamptz,
      review_reason=s->>'review_reason',synced_at=now()
      where subscription_id=s->>'subscription_id' and user_id=p_user;
    if not found then raise exception 'Unbound subscription' using errcode='22023'; end if;
  end loop;
  -- All bound subscriptions must have been fetched inside this lease.
  if exists(select 1 from stripe_subscriptions b where b.user_id=p_user and not exists
    (select 1 from jsonb_array_elements(p_snapshots) x where x->>'subscription_id'=b.subscription_id)) then
    raise exception 'Subscription set changed; retry reconciliation' using errcode='40001';
  end if;
  select * into winner from stripe_subscriptions where user_id=p_user and paid_through>now()
    and status in ('active','past_due','unpaid','paused','canceled')
    order by paid_through desc,subscription_id limit 1;
  if p.app_access_type='inactive' then problem:='inactive_account';
  elsif p.role in ('teacher','super_teacher','admin') or p.is_super_teacher then problem:='staff_access';
  elsif p.app_access_type='lesson_access' then problem:='lesson_access_preserved';
  elsif p.app_access_type in ('reading_access','student','paid','book_club','full_access')
    and p.app_access_subscription_id is null then problem:='manual_access_preserved';
  end if;
  if problem is not null then
    update stripe_subscriptions set review_reason=problem where user_id=p_user and paid_through>now();
    return;
  end if;
  perform set_config('mekuru.billing_write','on',true);
  if winner.subscription_id is not null then
    update profiles set app_access_type='reading_access',app_access_expires_at=winner.paid_through,
      app_access_subscription_id=winner.subscription_id where id=p_user;
    if (select count(*) from stripe_subscriptions where user_id=p_user
      and status not in ('canceled','incomplete_expired'))>1 then
      update stripe_subscriptions set review_reason='duplicate_subscriptions' where user_id=p_user;
    end if;
  elsif p.app_access_subscription_id is not null and p.app_access_type='reading_access' then
    -- No trial restart and no user-content changes. Expiry already enforces paid-through-only access.
    update profiles set app_access_type='free',app_access_expires_at=null,app_access_subscription_id=null where id=p_user;
  end if;
  perform set_config('mekuru.billing_write','off',true);
end $$;

create function public.activate_guided_trial(p_student uuid,p_reviewer uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p profiles%rowtype; started timestamptz:=now();
begin
  if not exists(select 1 from profiles where id=p_reviewer
    and (role in ('admin','super_teacher') or is_super_teacher)) then
    raise exception 'Reviewer required' using errcode='42501'; end if;
  select * into p from profiles where id=p_student for update;
  if not found then raise exception 'Profile required' using errcode='P0002'; end if;
  if p.trial_started_at is not null or p.app_access_type in ('trial','inactive')
    or p.role in ('teacher','super_teacher','admin') or p.is_super_teacher
    or p.app_access_subscription_id is not null
    or (p.app_access_type in ('reading_access','lesson_access','student','paid','book_club','full_access')
      and (p.app_access_expires_at is null or p.app_access_expires_at>=now()))
    or exists(select 1 from stripe_subscriptions where user_id=p_student
      and (status not in ('canceled','incomplete_expired') or paid_through>now())) then
    raise exception 'Trial already used or account has access' using errcode='P0001'; end if;
  if not exists(select 1 from japanese_learning_access_requests where user_id=p_student and status='approved') then
    raise exception 'Approved Guided Trial request required' using errcode='P0001'; end if;
  update profiles set app_access_type='trial',trial_started_at=started,
    app_access_expires_at=started+interval '28 days' where id=p_student returning * into p;
  return to_jsonb(p);
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('begin_stripe_checkout','bind_stripe_checkout',
      'acquire_billing_sync','release_billing_sync','apply_stripe_snapshot','activate_guided_trial') loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
commit;
