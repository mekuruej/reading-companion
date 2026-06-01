alter table public.teacher_students
add column if not exists archived_at timestamptz,
add column if not exists archived_by uuid references auth.users(id) on delete set null,
add column if not exists archive_reason text;

create index if not exists teacher_students_active_idx
on public.teacher_students (teacher_id, student_id)
where archived_at is null;

