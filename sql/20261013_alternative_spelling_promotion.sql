-- Apply after 20261012_live_lesson_finalized_visibility.sql, before deploying the editors.
-- Historical forms remain untouched. A key is pinned only for an explicit saved swap.
begin;
alter table public.user_book_words
  add column if not exists alternative_surface text,
  add column if not exists study_identity_key text;
comment on column public.user_book_words.alternative_surface is 'Another written form, shown on the answer side; never an implicit main-word override.';
comment on column public.user_book_words.study_identity_key is 'Existing Library Study identity retained when Main word and Alternative spelling are swapped.';

create or replace function public.preserve_promoted_word_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    NEW.study_identity_key := null;
  else
    NEW.study_identity_key := OLD.study_identity_key;
    if NEW.surface is distinct from OLD.surface and NEW.alternative_surface = OLD.surface then
      NEW.study_identity_key := coalesce(OLD.study_identity_key,
        case when nullif(btrim(OLD.reading), '') is not null
          then public.library_study_identity_key(OLD.surface, OLD.reading) end);
      NEW.seen_on := OLD.seen_on;
      -- A normal edit must not undo a deliberately excluded flashcard. Live
      -- lesson finalization still applies its existing readiness decision.
      if public.is_finalized_book_word(OLD.id) then
        NEW.excluded_from_flashcards := OLD.excluded_from_flashcards;
      end if;
      if NEW.meaning is not distinct from OLD.meaning
         and NEW.meaning_choice_index is not distinct from OLD.meaning_choice_index then
        NEW.meaning_choices := OLD.meaning_choices;
        NEW.other_definition := OLD.other_definition;
      end if;
      NEW.vocabulary_cache_id := OLD.vocabulary_cache_id;
      NEW.jlpt := OLD.jlpt;
      NEW.is_common := OLD.is_common;
      NEW.base_form := OLD.base_form;
      NEW.lookup_surface := OLD.lookup_surface;
      NEW.encountered_surface := OLD.encountered_surface;
    end if;
  end if;
  return NEW;
end;
$$;
drop trigger if exists preserve_promoted_word_identity on public.user_book_words;
create trigger preserve_promoted_word_identity before insert or update on public.user_book_words
for each row execute function public.preserve_promoted_word_identity();

-- Refresh SELECT * views to include the two appended fields. Existing RLS is retained.
create or replace view public.finalized_user_book_words with (security_invoker = true) as
select word.* from public.user_book_words word where public.is_finalized_book_word(word.id);

-- A linked teacher editor edits the same item's written forms, without copying it.
create or replace function public.sync_teacher_written_forms()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if NEW.linked_user_book_word_id is not null and
     (NEW.surface is distinct from OLD.surface or NEW.alternative_surface is distinct from OLD.alternative_surface) then
    update public.user_book_words set surface = NEW.surface, alternative_surface = NEW.alternative_surface
    where id = NEW.linked_user_book_word_id
      and (surface is distinct from NEW.surface or alternative_surface is distinct from NEW.alternative_surface);
  end if;
  return NEW;
end;
$$;
drop trigger if exists sync_teacher_written_forms on public.teacher_book_vocabulary;
create trigger sync_teacher_written_forms after update of surface, alternative_surface on public.teacher_book_vocabulary
for each row execute function public.sync_teacher_written_forms();

-- Keep an existing teaching association consistent when the reader promotes
-- the linked personal word. Caller permissions still govern each update.
create or replace function public.sync_reader_written_forms()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if NEW.surface is distinct from OLD.surface or NEW.alternative_surface is distinct from OLD.alternative_surface then
    update public.teacher_book_vocabulary set surface = NEW.surface, alternative_surface = NEW.alternative_surface
    where linked_user_book_word_id = NEW.id
      and (surface is distinct from NEW.surface or alternative_surface is distinct from NEW.alternative_surface);
  end if;
  return NEW;
end;
$$;
drop trigger if exists sync_reader_written_forms on public.user_book_words;
create trigger sync_reader_written_forms after update of surface, alternative_surface on public.user_book_words
for each row execute function public.sync_reader_written_forms();

create or replace function public.refresh_user_library_word_summary_for_key(
  p_user_id uuid,
  p_study_identity_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $refresh_one$
begin
  if p_user_id is null or coalesce(p_study_identity_key, '') = '' then
    return;
  end if;

  delete from public.user_library_word_summaries
  where user_id = p_user_id
    and study_identity_key = p_study_identity_key
    and not exists (
      select 1
      from public.finalized_user_book_words ubw
      join public.user_books ub on ub.id = ubw.user_book_id
      where ub.user_id = p_user_id
        and coalesce(ubw.target_language_code, 'ja') = 'ja'
        and coalesce(ubw.study_identity_key, public.library_study_identity_key(ubw.surface, ubw.reading)) = p_study_identity_key
    );

  insert into public.user_library_word_summaries (
    user_id,
    study_identity_key,
    definition_key,
    surface,
    reading,
    meaning,
    jlpt,
    is_common,
    total_encounter_count,
    check_ready_encounter_count,
    hidden_encounter_count,
    book_count,
    first_seen_at,
    last_seen_at,
    sample_user_book_word_id,
    sample_user_book_id,
    sample_book_title,
    sample_book_cover_url,
    updated_at
  )
  select
    ub.user_id,
    p_study_identity_key,
    '',
    (array_agg(nullif(btrim(ubw.surface), '') order by (ubw.study_identity_key is not null) desc, ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.reading), '') order by (ubw.study_identity_key is not null) desc, ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.meaning), '') order by (ubw.study_identity_key is not null) desc, ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.jlpt), '') order by (ubw.study_identity_key is not null) desc, ubw.created_at desc nulls last, ubw.id desc))[1],
    bool_or(coalesce(ubw.is_common, false)),
    count(*)::integer,
    count(*) filter (
      where coalesce(ubw.hidden, false) = false
        and nullif(btrim(coalesce(ubw.surface, '')), '') is not null
        and nullif(btrim(coalesce(ubw.reading, '')), '') is not null
        and nullif(btrim(coalesce(ubw.meaning, '')), '') is not null
    )::integer,
    count(*) filter (where coalesce(ubw.hidden, false) = true)::integer,
    count(distinct ubw.user_book_id)::integer,
    min(ubw.created_at),
    max(ubw.created_at),
    (array_agg(ubw.id order by (ubw.study_identity_key is not null) desc, ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(ubw.user_book_id order by (ubw.study_identity_key is not null) desc, ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(b.title order by (ubw.study_identity_key is not null) desc, ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(b.cover_url order by (ubw.study_identity_key is not null) desc, ubw.created_at desc nulls last, ubw.id desc))[1],
    now()
  from public.finalized_user_book_words ubw
  join public.user_books ub on ub.id = ubw.user_book_id
  left join public.books b on b.id = ub.book_id
  where ub.user_id = p_user_id
    and coalesce(ubw.target_language_code, 'ja') = 'ja'
    and coalesce(ubw.study_identity_key, public.library_study_identity_key(ubw.surface, ubw.reading)) = p_study_identity_key
  group by ub.user_id
  on conflict (user_id, study_identity_key, definition_key)
  do update set
    surface = excluded.surface,
    reading = excluded.reading,
    meaning = excluded.meaning,
    jlpt = excluded.jlpt,
    is_common = excluded.is_common,
    total_encounter_count = excluded.total_encounter_count,
    check_ready_encounter_count = excluded.check_ready_encounter_count,
    hidden_encounter_count = excluded.hidden_encounter_count,
    book_count = excluded.book_count,
    first_seen_at = excluded.first_seen_at,
    last_seen_at = excluded.last_seen_at,
    sample_user_book_word_id = excluded.sample_user_book_word_id,
    sample_user_book_id = excluded.sample_user_book_id,
    sample_book_title = excluded.sample_book_title,
    sample_book_cover_url = excluded.sample_book_cover_url,
    updated_at = now();
end;
$refresh_one$;

create or replace function public.refresh_user_library_word_summaries(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $refresh_all$
declare
  v_key text;
begin
  if p_user_id is null then
    return;
  end if;

  delete from public.user_library_word_summaries
  where user_id = p_user_id
    and study_identity_key not in (
      select distinct coalesce(ubw.study_identity_key, public.library_study_identity_key(ubw.surface, ubw.reading))
      from public.finalized_user_book_words ubw
      join public.user_books ub on ub.id = ubw.user_book_id
      where ub.user_id = p_user_id
        and coalesce(ubw.target_language_code, 'ja') = 'ja'
        and coalesce(ubw.study_identity_key, public.library_study_identity_key(ubw.surface, ubw.reading)) <> ''
    );

  for v_key in
    select distinct coalesce(ubw.study_identity_key, public.library_study_identity_key(ubw.surface, ubw.reading))
    from public.finalized_user_book_words ubw
    join public.user_books ub on ub.id = ubw.user_book_id
    where ub.user_id = p_user_id
      and coalesce(ubw.target_language_code, 'ja') = 'ja'
      and coalesce(ubw.study_identity_key, public.library_study_identity_key(ubw.surface, ubw.reading)) <> ''
  loop
    perform public.refresh_user_library_word_summary_for_key(p_user_id, v_key);
  end loop;
end;
$refresh_all$;

create or replace function public.refresh_my_library_word_summaries()
returns void
language plpgsql
security definer
set search_path = public
as $refresh_mine$
begin
  perform public.refresh_user_library_word_summaries(auth.uid());
end;
$refresh_mine$;

grant execute on function public.refresh_my_library_word_summaries() to authenticated;


-- Link creation removes a just-captured word from derived library summaries.
-- Session completion restores the same rows to those summaries. Review edits
-- already use the existing user_book_words summary trigger.
create or replace function public.refresh_library_from_lesson_visibility()
returns trigger language plpgsql security definer set search_path = public as $$
declare target record;
begin
  if TG_TABLE_NAME = 'live_lesson_capture_sessions' then
    for target in
      select distinct ub.user_id, coalesce(w.study_identity_key, public.library_study_identity_key(w.surface, w.reading)) as key
      from public.live_lesson_capture_session_words link
      join public.user_book_words w on w.id = link.user_book_word_id
      join public.user_books ub on ub.id = w.user_book_id
      where link.session_id = NEW.id
    loop
      perform public.refresh_user_library_word_summary_for_key(target.user_id, target.key);
    end loop;
  else
    for target in
      select ub.user_id, coalesce(w.study_identity_key, public.library_study_identity_key(w.surface, w.reading)) as key
      from public.user_book_words w join public.user_books ub on ub.id = w.user_book_id
      where w.id in (
        case when TG_OP <> 'DELETE' then NEW.user_book_word_id else null end,
        case when TG_OP <> 'INSERT' then OLD.user_book_word_id else null end
      )
    loop
      perform public.refresh_user_library_word_summary_for_key(target.user_id, target.key);
    end loop;
  end if;
  return null;
end;
$$;
revoke all on function public.refresh_library_from_lesson_visibility() from public;
drop trigger if exists refresh_library_from_lesson_status on public.live_lesson_capture_sessions;
create trigger refresh_library_from_lesson_status after update of status on public.live_lesson_capture_sessions
for each row when (OLD.status is distinct from NEW.status)
execute function public.refresh_library_from_lesson_visibility();
drop trigger if exists refresh_library_from_lesson_link on public.live_lesson_capture_session_words;
create trigger refresh_library_from_lesson_link after insert or update or delete on public.live_lesson_capture_session_words
for each row execute function public.refresh_library_from_lesson_visibility();


-- Library word encounter summaries: 02c trigger
--
-- Run this after 02b_refresh_all.

create or replace function public.refresh_library_word_summary_from_word()
returns trigger
language plpgsql
security definer
set search_path = public
as $summary_trigger$
declare
  v_old_user_id uuid;
  v_new_user_id uuid;
  v_old_key text;
  v_new_key text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select user_id into v_old_user_id
    from public.user_books
    where id = old.user_book_id;

    v_old_key := coalesce(old.study_identity_key, public.library_study_identity_key(old.surface, old.reading));
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select user_id into v_new_user_id
    from public.user_books
    where id = new.user_book_id;

    v_new_key := coalesce(new.study_identity_key, public.library_study_identity_key(new.surface, new.reading));
  end if;

  if v_old_user_id is not null and coalesce(v_old_key, '') <> '' then
    perform public.refresh_user_library_word_summary_for_key(v_old_user_id, v_old_key);
  end if;

  if v_new_user_id is not null
    and coalesce(v_new_key, '') <> ''
    and (v_old_user_id is distinct from v_new_user_id or v_old_key is distinct from v_new_key)
  then
    perform public.refresh_user_library_word_summary_for_key(v_new_user_id, v_new_key);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$summary_trigger$;

drop trigger if exists refresh_library_word_summary_from_word
  on public.user_book_words;

create trigger refresh_library_word_summary_from_word
after insert or update or delete on public.user_book_words
for each row
execute function public.refresh_library_word_summary_from_word();

notify pgrst, 'reload schema';
commit;
