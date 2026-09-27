-- Apply before deploying the workspace action. No tables or columns are added.
-- Both entry routes lock the profile, preventing duplicate requests on concurrent clicks.
create or replace function public.approve_student_guided_trial(student_id uuid, reviewer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  learner public.profiles%rowtype;
  invitation public.japanese_learning_access_requests%rowtype;
  access_type text;
begin
  if not exists (select 1 from public.profiles where id = reviewer_id
    and (role = 'super_teacher' or is_super_teacher = true)) then
    raise exception 'Super teacher access is required' using errcode = '42501';
  end if;
  select * into learner from public.profiles where id = student_id for update;
  if not found then raise exception 'Student not found' using errcode = 'P0002'; end if;
  access_type := lower(trim(coalesce(learner.app_access_type, '')));
  if learner.role in ('teacher', 'super_teacher', 'admin') or learner.is_super_teacher = true
    or access_type = 'trial'
    or (access_type in ('reading_access', 'lesson_access', 'student', 'paid', 'book_club', 'full_access')
      and (learner.app_access_expires_at is null or learner.app_access_expires_at >= now())) then
    return jsonb_build_object('status', 'existing_access', 'unchanged', true);
  end if;
  select * into invitation from public.japanese_learning_access_requests
    where user_id = student_id and status = 'approved' order by requested_at desc limit 1;
  if found then
    return jsonb_build_object('status', 'approved', 'requestId', invitation.id, 'unchanged', true);
  end if;
  -- Reuse pending requests first, then a previously declined record if one exists.
  select * into invitation from public.japanese_learning_access_requests
    where user_id = student_id
    order by (status = 'pending') desc, requested_at desc limit 1 for update;
  if found then
    update public.japanese_learning_access_requests set status = 'approved', reviewed_at = now(),
      reviewed_by = reviewer_id, review_note = 'Approved from Student Workspace'
      where id = invitation.id;
  else
    insert into public.japanese_learning_access_requests
      (user_id, status, reviewed_at, reviewed_by, review_note)
    values (student_id, 'approved', now(), reviewer_id, 'Approved from Student Workspace')
    returning * into invitation;
  end if;
  return jsonb_build_object('status', 'approved', 'requestId', invitation.id);
end;
$$;

-- The website form uses the same lock and returns an existing approval when present.
create or replace function public.submit_japanese_learning_request(
  student_id uuid, request_note text, experience text, jlpt text, source text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare invitation public.japanese_learning_access_requests%rowtype;
begin
  perform 1 from public.profiles where id = student_id for update;
  if not found then raise exception 'Student not found' using errcode = 'P0002'; end if;
  select * into invitation from public.japanese_learning_access_requests
    where user_id = student_id and status in ('approved', 'pending')
    order by (status = 'approved') desc, requested_at desc limit 1;
  if not found then
    insert into public.japanese_learning_access_requests
      (user_id, status, note, reading_experience, jlpt_level, request_source)
    values (student_id, 'pending', request_note, experience, jlpt, source)
    returning * into invitation;
  end if;
  return to_jsonb(invitation);
end;
$$;

-- Only authenticated server routes may supply student/reviewer IDs.
revoke all on function public.approve_student_guided_trial(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_student_guided_trial(uuid, uuid) to service_role;
revoke all on function public.submit_japanese_learning_request(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_japanese_learning_request(uuid, text, text, text, text) to service_role;
