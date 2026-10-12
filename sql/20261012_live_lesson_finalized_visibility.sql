-- Apply before deploying consumers of finalized_user_book_words.
-- No vocabulary columns or workflow states are added.
begin;

create or replace function public.is_finalized_book_word(p_word_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from public.live_lesson_capture_session_words link
    join public.live_lesson_capture_sessions session on session.id = link.session_id
    where link.user_book_word_id = p_word_id and session.status <> 'completed'
  );
$$;
-- Session RLS is teacher-only. This predicate must see the linkage even when
-- the student reads their vocabulary. It exposes no session or owner details.
revoke all on function public.is_finalized_book_word(uuid) from public;
grant execute on function public.is_finalized_book_word(uuid) to authenticated, service_role;

create or replace view public.finalized_user_book_words with (security_invoker = true) as
select word.* from public.user_book_words word
where public.is_finalized_book_word(word.id);
grant select on public.finalized_user_book_words to authenticated, service_role;

create or replace view public.finalized_teacher_book_vocabulary with (security_invoker = true) as
select word.* from public.teacher_book_vocabulary word
where word.linked_user_book_word_id is null
   or public.is_finalized_book_word(word.linked_user_book_word_id);
grant select on public.finalized_teacher_book_vocabulary to authenticated, service_role;

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
        and public.library_study_identity_key(ubw.surface, ubw.reading) = p_study_identity_key
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
    (array_agg(nullif(btrim(ubw.surface), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.reading), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.meaning), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(nullif(btrim(ubw.jlpt), '') order by ubw.created_at desc nulls last, ubw.id desc))[1],
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
    (array_agg(ubw.id order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(ubw.user_book_id order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(b.title order by ubw.created_at desc nulls last, ubw.id desc))[1],
    (array_agg(b.cover_url order by ubw.created_at desc nulls last, ubw.id desc))[1],
    now()
  from public.finalized_user_book_words ubw
  join public.user_books ub on ub.id = ubw.user_book_id
  left join public.books b on b.id = ub.book_id
  where ub.user_id = p_user_id
    and coalesce(ubw.target_language_code, 'ja') = 'ja'
    and public.library_study_identity_key(ubw.surface, ubw.reading) = p_study_identity_key
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
      select distinct public.library_study_identity_key(ubw.surface, ubw.reading)
      from public.finalized_user_book_words ubw
      join public.user_books ub on ub.id = ubw.user_book_id
      where ub.user_id = p_user_id
        and coalesce(ubw.target_language_code, 'ja') = 'ja'
        and public.library_study_identity_key(ubw.surface, ubw.reading) <> ''
    );

  for v_key in
    select distinct public.library_study_identity_key(ubw.surface, ubw.reading)
    from public.finalized_user_book_words ubw
    join public.user_books ub on ub.id = ubw.user_book_id
    where ub.user_id = p_user_id
      and coalesce(ubw.target_language_code, 'ja') = 'ja'
      and public.library_study_identity_key(ubw.surface, ubw.reading) <> ''
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
      select distinct ub.user_id, public.library_study_identity_key(w.surface, w.reading) as key
      from public.live_lesson_capture_session_words link
      join public.user_book_words w on w.id = link.user_book_word_id
      join public.user_books ub on ub.id = w.user_book_id
      where link.session_id = NEW.id
    loop
      perform public.refresh_user_library_word_summary_for_key(target.user_id, target.key);
    end loop;
  else
    for target in
      select ub.user_id, public.library_study_identity_key(w.surface, w.reading) as key
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

-- Repair existing summaries, including enriched but deferred captures.
do $$ declare owner_id uuid; begin
  for owner_id in select distinct user_book.user_id
    from public.live_lesson_capture_session_words link
    join public.user_book_words word on word.id = link.user_book_word_id
    join public.user_books user_book on user_book.id = word.user_book_id
  loop
    perform public.refresh_user_library_word_summaries(owner_id);
  end loop;
end $$;

create or replace function public.capture_live_lesson_word(p_session_id uuid, p_word jsonb, p_position integer)
returns setof public.user_book_words language plpgsql security invoker set search_path = public as $$
declare saved public.user_book_words; session_book uuid;
begin
  select user_book_id into session_book from public.live_lesson_capture_sessions
  where id = p_session_id and status in ('capturing', 'reviewing', 'deferred') for update;
  if session_book is null or session_book <> (p_word->>'user_book_id')::uuid then
    raise exception 'Invalid Live Lesson capture session';
  end if;
  insert into public.user_book_words (user_book_id, vocabulary_cache_id, surface, encountered_surface, base_form, lookup_surface, target_language_code, support_language_code, item_type, reading, meaning, other_definition, meaning_choices, meaning_choice_index, jlpt, is_common, page_number, position_unit, position_value, percent_location, page_order, chapter_number, chapter_name, hidden, excluded_from_flashcards, seen_on)
  select draft.user_book_id, draft.vocabulary_cache_id, draft.surface, draft.encountered_surface, draft.base_form, draft.lookup_surface, draft.target_language_code, draft.support_language_code, draft.item_type, draft.reading, draft.meaning, draft.other_definition, draft.meaning_choices, draft.meaning_choice_index, draft.jlpt, draft.is_common, draft.page_number, draft.position_unit, draft.position_value, draft.percent_location, draft.page_order, draft.chapter_number, draft.chapter_name, draft.hidden, draft.excluded_from_flashcards, draft.seen_on from jsonb_populate_record(null::public.user_book_words, p_word) draft
  returning * into saved;
  insert into public.live_lesson_capture_session_words(session_id, user_book_word_id, position)
  values (p_session_id, saved.id, p_position);
  return next saved;
end;
$$;
revoke all on function public.capture_live_lesson_word(uuid, jsonb, integer) from public, authenticated;
grant execute on function public.capture_live_lesson_word(uuid, jsonb, integer) to service_role;

notify pgrst, 'reload schema';
commit;
