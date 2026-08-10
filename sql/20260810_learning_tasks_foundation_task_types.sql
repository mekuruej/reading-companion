-- Allow teacher-created foundation study tasks.
--
-- Run this in Supabase SQL editor after the learning_tasks migrations.

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
    'study_kana',
    'foundations_vocabulary',
    'listening'
  )
);
