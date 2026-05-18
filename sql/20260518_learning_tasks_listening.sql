-- Allow teacher-created listening tasks.
--
-- Run this in Supabase SQL editor after the original learning_tasks migration.

alter table public.learning_tasks
drop constraint if exists learning_tasks_task_type_check;

alter table public.learning_tasks
add constraint learning_tasks_task_type_check
check (
  task_type in (
    'reread_pages',
    'review_book_words',
    'review_recent_words',
    'kanji_reading_practice',
    'listening'
  )
);
