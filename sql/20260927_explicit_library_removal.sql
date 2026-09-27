-- Apply before deploying the explicit keep/remove teaching-book choice.
-- Service-role only; the API supplies the authenticated actor, never a body user id.
create or replace function public.remove_owned_library_book(
  p_actor_id uuid, p_user_book_id uuid, p_remove_teaching boolean default false
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_book_id uuid;
  v_teacher_book_ids uuid[];
  v_has_teaching boolean;
begin
  if p_actor_id is null or p_user_book_id is null then
    raise exception 'Missing owner or book';
  end if;
  select book_id into v_book_id from public.user_books
    where id = p_user_book_id and user_id = p_actor_id for update;
  if not found then raise exception 'Book not found or not owned by this user'; end if;

  -- Never remove another teacher's anchor or a link to a different edition/copy.
  if exists (select 1 from public.teacher_books where user_book_id = p_user_book_id
      and (teacher_id <> p_actor_id or book_id <> v_book_id))
    or exists (select 1 from public.teacher_books where teacher_id = p_actor_id and book_id = v_book_id
      and user_book_id is not null and user_book_id <> p_user_book_id)
    or exists (select 1 from public.teacher_book_prep_items where prep_user_book_id = p_user_book_id
      and (teacher_id <> p_actor_id or book_id <> v_book_id))
    or exists (select 1 from public.teacher_notebook_entry_contexts c
      join public.teacher_notebook_entries e on e.id = c.entry_id
      where c.user_book_id = p_user_book_id and e.teacher_id <> p_actor_id)
    or exists (select 1 from public.teacher_notebook_word_lists where user_book_id = p_user_book_id and teacher_id <> p_actor_id)
  then raise exception 'This copy anchors another teaching workspace; nothing was removed'; end if;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_teacher_book_ids
    from public.teacher_books where teacher_id = p_actor_id and book_id = v_book_id;
  v_has_teaching := cardinality(v_teacher_book_ids) > 0
    or exists (select 1 from public.teacher_book_prep_items where teacher_id = p_actor_id and (book_id = v_book_id or prep_user_book_id = p_user_book_id))
    or exists (select 1 from public.teacher_book_vocabulary where teacher_id = p_actor_id and book_id = v_book_id)
    or exists (select 1 from public.teacher_notebook_entry_contexts c join public.teacher_notebook_entries e on e.id = c.entry_id
      where e.teacher_id = p_actor_id and (c.book_id = v_book_id or c.user_book_id = p_user_book_id))
    or exists (select 1 from public.teacher_notebook_word_lists where teacher_id = p_actor_id and (book_id = v_book_id or user_book_id = p_user_book_id))
    or exists (select 1 from public.teacher_student_lesson_books l join public.user_books ub on ub.id = l.user_book_id
      where l.teacher_id = p_actor_id and ub.book_id = v_book_id);
  if v_has_teaching and not coalesce(p_remove_teaching, false) then
    raise exception 'An explicit teaching removal choice is required';
  end if;

  if p_remove_teaching then
    -- Notebook content and student-owned copies remain. Their nullable links are
    -- detached by existing foreign keys; their catalog-book links remain intact.
    delete from public.teacher_book_vocabulary where teacher_id = p_actor_id and book_id = v_book_id;
    delete from public.teacher_book_prep_items where teacher_id = p_actor_id and (book_id = v_book_id or prep_user_book_id = p_user_book_id);
    delete from public.teacher_book_items where teacher_book_id = any(v_teacher_book_ids);
    delete from public.teacher_books where id = any(v_teacher_book_ids) and teacher_id = p_actor_id;
  end if;

  delete from public.user_word_collocations where user_book_id = p_user_book_id;
  delete from public.study_logs where user_book_id = p_user_book_id;
  delete from public.user_study_events where user_book_id = p_user_book_id;
  delete from public.user_alerts where user_book_id = p_user_book_id;
  delete from public.user_book_detective_entries where user_book_id = p_user_book_id;
  delete from public.user_book_characters where user_book_id = p_user_book_id;
  delete from public.user_book_chapter_summaries where user_book_id = p_user_book_id;
  delete from public.user_book_reading_sessions where user_book_id = p_user_book_id;
  delete from public.learning_tasks where user_book_id = p_user_book_id;
  delete from public.user_book_words where user_book_id = p_user_book_id;
  delete from public.user_books where id = p_user_book_id and user_id = p_actor_id;
end;
$$;
revoke all on function public.remove_owned_library_book(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.remove_owned_library_book(uuid, uuid, boolean) to service_role;
