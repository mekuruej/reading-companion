-- Add structured onboarding context to Japanese Learning invitation requests.

alter table public.japanese_learning_access_requests
  add column if not exists reading_experience text,
  add column if not exists jlpt_level text;

alter table public.japanese_learning_access_requests
  drop constraint if exists japanese_learning_access_requests_reading_experience_check,
  add constraint japanese_learning_access_requests_reading_experience_check
    check (
      reading_experience is null or
      reading_experience in (
        'starting',
        'lots_of_support',
        'independent_slow',
        'comfortable',
        'not_sure'
      )
    );

alter table public.japanese_learning_access_requests
  drop constraint if exists japanese_learning_access_requests_jlpt_level_check,
  add constraint japanese_learning_access_requests_jlpt_level_check
    check (
      jlpt_level is null or
      jlpt_level in (
        'n5',
        'n4',
        'n3',
        'n2',
        'n1',
        'not_sure',
        'not_taken'
      )
    );
