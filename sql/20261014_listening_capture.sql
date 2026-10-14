-- Apply to development/test first. No historical vocabulary is changed.
begin;
create table if not exists public.listening_capture_sessions (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 user_book_id uuid not null references public.user_books(id) on delete cascade,
 started_at timestamptz not null,
 reading_session_id uuid unique references public.user_book_reading_sessions(id) on delete cascade,
 completed_at timestamptz,
 check ((reading_session_id is null) = (completed_at is null))
);
create index if not exists listening_capture_book on public.listening_capture_sessions(user_book_id);
create table if not exists public.listening_session_words (
 id uuid primary key,
 capture_session_id uuid not null references public.listening_capture_sessions(id) on delete cascade,
 surface text not null check (length(trim(surface)) between 1 and 1000),
 reading text not null default '' check (length(reading)<=1000),
 meaning text not null default '' check (length(meaning)<=10000),
 alternative_surface text not null default '' check (length(alternative_surface)<=1000),
 created_at timestamptz not null default now()
);
create index if not exists listening_words_session on public.listening_session_words(capture_session_id,created_at,id);
alter table public.listening_capture_sessions enable row level security;
alter table public.listening_session_words enable row level security;
drop policy if exists listening_capture_owner on public.listening_capture_sessions;
create policy listening_capture_owner on public.listening_capture_sessions for select to authenticated
 using (user_id=auth.uid() and exists(select 1 from public.user_books b where b.id=user_book_id and b.user_id=auth.uid()));
drop policy if exists listening_words_owner on public.listening_session_words;
create policy listening_words_owner on public.listening_session_words for select to authenticated
 using (exists(select 1 from public.listening_capture_sessions s where s.id=capture_session_id and s.user_id=auth.uid()));
-- Mutations are only through validated functions. No teacher or public write grants.
revoke all on public.listening_capture_sessions, public.listening_session_words from public, anon, authenticated;
grant select on public.listening_capture_sessions, public.listening_session_words to authenticated;

create or replace function public.start_listening_capture(p_id uuid,p_book uuid,p_started_at timestamptz)
returns public.listening_capture_sessions language plpgsql security definer set search_path=public as $$
declare s public.listening_capture_sessions;
begin
 if auth.uid() is null or not exists(select 1 from public.user_books where id=p_book and user_id=auth.uid()) then raise exception 'Listening capture requires the book owner'; end if;
 insert into public.listening_capture_sessions(id,user_id,user_book_id,started_at)
 values(p_id,auth.uid(),p_book,p_started_at) on conflict(id) do nothing;
 select * into s from public.listening_capture_sessions where id=p_id;
 if s.user_id<>auth.uid() or s.user_book_id<>p_book then raise exception 'Invalid listening session'; end if;
 return s;
end $$;

create or replace function public.save_listening_word(p_session uuid,p_id uuid,p_word jsonb)
returns public.listening_session_words language plpgsql security definer set search_path=public as $$
declare s public.listening_capture_sessions; w public.listening_session_words;
begin
 select * into s from public.listening_capture_sessions where id=p_session for update;
 if s.id is null or auth.uid() is null or s.user_id<>auth.uid() or not exists(select 1 from public.user_books where id=s.user_book_id and user_id=auth.uid()) then raise exception 'Invalid listening session'; end if;
 -- A retry after a lost response returns the original observation, even after finish.
 select * into w from public.listening_session_words where id=p_id;
 if w.id is not null then
   if w.capture_session_id<>p_session then raise exception 'Invalid listening word'; end if;
   return w;
 end if;
 if s.completed_at is not null then raise exception 'Listening session is already completed'; end if;
 insert into public.listening_session_words(id,capture_session_id,surface,reading,meaning,alternative_surface)
 values(p_id,p_session,trim(p_word->>'surface'),coalesce(p_word->>'reading',''),coalesce(p_word->>'meaning',''),coalesce(p_word->>'alternative_surface','')) returning * into w;
 return w;
end $$;

create or replace function public.finish_listening_capture(p_session uuid,p_history jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare s public.listening_capture_sessions; h uuid;
begin
 select * into s from public.listening_capture_sessions where id=p_session for update;
 if s.id is null or auth.uid() is null or s.user_id<>auth.uid() or not exists(select 1 from public.user_books where id=s.user_book_id and user_id=auth.uid()) then raise exception 'Invalid listening session'; end if;
 if s.reading_session_id is not null then return s.reading_session_id; end if;
 if coalesce((p_history->>'minutes_read')::integer,0)<1 then raise exception 'Listening minutes required'; end if;
 insert into public.user_book_reading_sessions(user_book_id,read_on,minutes_read,session_mode,tracking_unit,start_page,end_page,start_position,end_position,progress_total,ending_phrase)
 values(s.user_book_id,(p_history->>'read_on')::date,(p_history->>'minutes_read')::integer,'listening',p_history->>'tracking_unit',null,(p_history->>'end_page')::integer,null,(p_history->>'end_position')::numeric,(p_history->>'progress_total')::numeric,nullif(trim(p_history->>'ending_phrase'),'')) returning id into h;
 update public.listening_capture_sessions set reading_session_id=h,completed_at=now() where id=p_session;
 return h;
end $$;
revoke all on function public.start_listening_capture(uuid,uuid,timestamptz),public.save_listening_word(uuid,uuid,jsonb),public.finish_listening_capture(uuid,jsonb) from public,anon;
grant execute on function public.start_listening_capture(uuid,uuid,timestamptz),public.save_listening_word(uuid,uuid,jsonb),public.finish_listening_capture(uuid,jsonb) to authenticated;
-- Linked history cannot be reclassified or moved; direct teacher mutations cannot
-- alter/delete private capture history. Service-role routes must validate ownership.
create or replace function public.protect_listening_capture_history() returns trigger
language plpgsql security definer set search_path=public as $$
declare owner_id uuid;
begin
 select user_id into owner_id from public.listening_capture_sessions where reading_session_id=old.id;
 if owner_id is not null then
  if auth.uid() is not null and auth.uid()<>owner_id then raise exception 'Only the owner may change captured listening history'; end if;
  if tg_op='UPDATE' and (new.user_book_id<>old.user_book_id or new.session_mode<>'listening' or new.id<>old.id) then raise exception 'Captured listening history cannot be moved or reclassified'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function public.protect_listening_capture_history() from public;
drop trigger if exists protect_listening_capture_history on public.user_book_reading_sessions;
create trigger protect_listening_capture_history before update or delete on public.user_book_reading_sessions
 for each row execute function public.protect_listening_capture_history();
commit;
