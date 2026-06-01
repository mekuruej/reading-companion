-- Book Recommendation Signals Backfill
--
-- Run this after 20260601_book_recommendation_signals.sql.
-- Copies existing public-safe reader-fit signals out of user_books.
-- This does not expose private review text, notes, saved words, sessions, or vocabulary.

insert into public.book_recommendation_signals (
  book_id,
  user_book_id,
  user_id,
  reader_level,
  book_type,
  difficulty_rating,
  entertainment_rating,
  reader_advice,
  is_active
)
select
  ub.book_id,
  ub.id as user_book_id,
  ub.user_id,
  nullif(trim(coalesce(ub.reader_level, p.level)), '') as reader_level,
  nullif(trim(b.book_type), '') as book_type,
  ub.rating_difficulty as difficulty_rating,
  ub.rating_overall as entertainment_rating,
  left(nullif(trim(ub.reader_advice), ''), 160) as reader_advice,
  true as is_active
from public.user_books ub
join public.books b
  on b.id = ub.book_id
left join public.profiles p
  on p.id = ub.user_id
where ub.book_id is not null
  and (
    ub.rating_difficulty is not null
    or ub.rating_overall is not null
    or nullif(trim(ub.reader_advice), '') is not null
  )
on conflict (user_book_id)
do update set
  book_id = excluded.book_id,
  user_id = excluded.user_id,
  reader_level = excluded.reader_level,
  book_type = excluded.book_type,
  difficulty_rating = excluded.difficulty_rating,
  entertainment_rating = excluded.entertainment_rating,
  reader_advice = excluded.reader_advice,
  is_active = true;

