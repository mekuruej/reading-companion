import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const migration=fs.readFileSync('sql/20261012_live_lesson_finalized_visibility.sql','utf8');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function fixture(){
 const db=new PGlite();
 await db.exec(`
 create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.actor_id',true),'')::uuid$$;
 create table books(id uuid primary key,title text,cover_url text);
 create table user_books(id uuid primary key,user_id uuid references auth.users,book_id uuid references books);
 create table user_book_words(
 id uuid primary key default gen_random_uuid(),user_book_id uuid references user_books,
 vocabulary_cache_id bigint,surface text,encountered_surface text,base_form text,lookup_surface text,
 target_language_code text,support_language_code text,item_type text,reading text,meaning text,other_definition text,
 meaning_choices jsonb,meaning_choice_index integer,jlpt text,is_common boolean,page_number integer,
 position_unit text,position_value numeric,percent_location numeric,page_order integer,chapter_number integer,chapter_name text,
 hidden boolean default false,excluded_from_flashcards boolean default false,seen_on date,created_at timestamptz default now());
 create table teacher_book_vocabulary(id uuid primary key,linked_user_book_word_id uuid references user_book_words,surface text,alternative_surface text);
 insert into auth.users values('${id(1)}'),('${id(2)}'),('${id(3)}');
 insert into books values('${id(4)}','Book',null);
 insert into user_books values('${id(5)}','${id(2)}','${id(4)}'),('${id(6)}','${id(3)}','${id(4)}');
 `);
 for(const file of ['sql/20260715_live_lesson_capture_sessions.sql','sql/20260501_library_word_summaries_01_table.sql','sql/20260714_japanese_library_word_summaries_language_scope.sql','sql/20260501_library_word_summaries_02c_trigger.sql'])
  await db.exec(fs.readFileSync(file,'utf8').replace(/create extension if not exists pgcrypto;/g,''));
 await db.exec(`insert into live_lesson_capture_sessions(id,teacher_id,student_id,user_book_id) values('${id(7)}','${id(1)}','${id(2)}','${id(5)}');`);
 await db.exec(migration);
 return db;
}
async function capture(db,surface='もってきた'){
 return (await db.query('select * from capture_live_lesson_word($1,$2::jsonb,1)',[id(7),JSON.stringify({user_book_id:id(5),surface,encountered_surface:surface,base_form:surface,lookup_surface:surface,target_language_code:'ja',page_number:12,position_unit:'page',position_value:12,chapter_number:2,hidden:false,excluded_from_flashcards:true})])).rows[0];
}
async function rows(db,table){return (await db.query(`select * from ${table}`)).rows;}

test('SQL capture/defer/resume/finalize: normal views and library summaries exclude drafts without losing original rows',async()=>{
 const db=await fixture();try {
 const word=await capture(db);const second=await capture(db,'猫');
 await db.query('insert into teacher_book_vocabulary(id,linked_user_book_word_id,surface) values($1,$2,$3)',[id(8),word.id,'もってきた']);
 assert.equal((await rows(db,'user_book_words')).length,2);
 for(const table of ['finalized_user_book_words','finalized_teacher_book_vocabulary','user_library_word_summaries']) assert.equal((await rows(db,table)).length,0,table);
 await db.exec(`update live_lesson_capture_sessions set status='reviewing' where id='${id(7)}';`);
 await db.query("update user_book_words set surface='持ってくる',reading='もってくる',meaning='bring',page_number=14 where id=$1",[word.id]);
 await db.exec(`update live_lesson_capture_sessions set status='deferred' where id='${id(7)}';`);
 for(const table of ['finalized_user_book_words','finalized_teacher_book_vocabulary','user_library_word_summaries']) assert.equal((await rows(db,table)).length,0,table);
 const resumed=await db.query(`select w.* from live_lesson_capture_sessions s join live_lesson_capture_session_words l on l.session_id=s.id join user_book_words w on w.id=l.user_book_word_id where s.student_id=$1 and s.user_book_id=$2 and s.status in ('reviewing','deferred')`,[id(2),id(5)]);
 assert.equal(resumed.rows.length,2);const restored=resumed.rows.find(w=>w.id===word.id);assert.equal(restored.surface,'持ってくる');assert.equal(restored.page_number,14);assert.equal(restored.encountered_surface,'もってきた');assert.deepEqual(restored.created_at,word.created_at);
 // Existing completion ordering: word eligibility may update before session state.
 await db.query('update user_book_words set excluded_from_flashcards=false where id=$1',[word.id]);
 assert.equal((await rows(db,'finalized_user_book_words')).length,0);
 await db.exec(`update live_lesson_capture_sessions set status='completed' where id='${id(7)}';`);
 assert.equal((await rows(db,'finalized_user_book_words')).length,2);assert.equal((await rows(db,'finalized_teacher_book_vocabulary')).length,1);
 assert.equal((await db.query('select * from finalized_user_book_words where excluded_from_flashcards=false')).rows.length,1);
 assert.equal((await rows(db,'user_library_word_summaries')).find(w=>w.surface==='持ってくる').check_ready_encounter_count,1);
 assert.deepEqual(new Set((await rows(db,'user_book_words')).map(w=>w.id)),new Set([word.id,second.id]));
 assert.equal((await rows(db,'live_lesson_capture_sessions')).length,1);
 await db.exec(migration);assert.equal((await rows(db,'user_book_words')).length,2);
 }finally{await db.close();}
});

test('SQL views honor student RLS even though the student cannot read teacher sessions',async()=>{
 const db=await fixture();try{
 await capture(db);
 await db.exec(`insert into user_book_words(user_book_id,surface,reading,meaning) values('${id(5)}','本','ほん','book'),('${id(6)}','犬','いぬ','dog');
 alter table user_book_words enable row level security;
 create policy own_words on user_book_words for select using (exists(select 1 from user_books b where b.id=user_book_id and b.user_id=auth.uid()));
 grant usage on schema auth to authenticated; grant select on user_books,user_book_words,live_lesson_capture_sessions,live_lesson_capture_session_words to authenticated;
 set role authenticated; set app.actor_id='${id(2)}';`);
 assert.equal((await rows(db,'live_lesson_capture_sessions')).length,0);
 const visible=await rows(db,'finalized_user_book_words');assert.equal(visible.length,1);assert.equal(visible[0].surface,'本');
 await assert.rejects(db.query('select * from capture_live_lesson_word($1,$2,1)',[id(7),'{}']),/permission denied/);
 }finally{await db.close();}
});

test('SQL atomic capture rolls back a failed association and rejects a wrong book',async()=>{
 const db=await fixture();try{
 await assert.rejects(db.query('select * from capture_live_lesson_word($1,$2,1)',[id(7),JSON.stringify({user_book_id:id(6),surface:'wrong'})]),/Invalid Live Lesson/);
 await db.exec(`create function reject_test_link() returns trigger language plpgsql as $$begin raise exception 'test link failed';end$$;
 create trigger reject_test_link before insert on live_lesson_capture_session_words for each row execute function reject_test_link();`);
 await assert.rejects(capture(db),/test link failed/);
 assert.equal((await rows(db,'user_book_words')).length,0);assert.equal((await rows(db,'user_library_word_summaries')).length,0);
 }finally{await db.close();}
});

test('SQL backfill removes existing deferred summary pollution without deleting an ordinary encounter',async()=>{
 const db=await fixture();try{
 const word=await capture(db,'本');
 await db.query("update user_book_words set reading='ほん',meaning='temporary' where id=$1",[word.id]);
 await db.exec(`insert into user_book_words(user_book_id,surface,reading,meaning,target_language_code) values('${id(5)}','本','ほん','book','ja');`);
 // Simulate a previously deployed summary function including all encounters.
 await db.exec(fs.readFileSync('sql/20260714_japanese_library_word_summaries_language_scope.sql','utf8'));
 await db.exec(`select refresh_user_library_word_summaries('${id(2)}');`);
 assert.equal((await rows(db,'user_library_word_summaries'))[0].total_encounter_count,2);
 await db.exec(migration);
 assert.equal((await rows(db,'user_library_word_summaries'))[0].total_encounter_count,1);
 assert.equal((await rows(db,'user_library_word_summaries'))[0].meaning,'book');
 await db.exec(`update live_lesson_capture_sessions set status='cancelled' where id='${id(7)}';`);
 assert.equal((await rows(db,'finalized_user_book_words')).length,1);
 }finally{await db.close();}
});

test('normal vocabulary/study queries use the shared gate; review and workspace retain session access',()=>{
 for(const file of [
  'app/(protected)/books/[userBookId]/words/page.tsx',
  'app/(protected)/books/[userBookId]/words/[wordId]/page.tsx',
  'app/(protected)/books/[userBookId]/study/page.tsx',
  'app/(protected)/library-study/check/page.tsx',
  'app/(protected)/library-study/practice/page.tsx',
  'app/(protected)/teacher/words/page.tsx',
  'app/api/books/[userBookId]/word-context/route.ts',
 ]) {
  const source=fs.readFileSync(file,'utf8');
  assert.match(source, /\.from\("(?:finalized_user_book_words|personal_user_book_words|study_visible_user_book_words)"\)/, file);
  assert.ok(!/\.from\("user_book_words"\)\s*\.select\(/.test(source),file);
 }
 for(const file of ['lib/teacher/teacherBookVocabulary.ts','app/(protected)/teacher/library/[teacherBookId]/follow/components/TeacherFollowAlongPanel.tsx']) {
  const source=fs.readFileSync(file,'utf8');assert.ok(source.includes('.from("finalized_teacher_book_vocabulary")'),file);
 }
 const personal=fs.readFileSync('sql/20261014_personal_word_visibility.sql','utf8');
 assert.match(personal, /from public\.finalized_user_book_words w/);
 assert.match(personal, /select \* from public\.personal_user_book_words where not flashcard_hidden/);
 const review=fs.readFileSync('app/api/teacher/live-lesson-words/route.ts','utf8');
 assert.ok(review.includes('.from("user_book_words")'));assert.ok(!review.includes('.from("finalized_user_book_words")'));
 assert.ok(review.includes('.rpc("capture_live_lesson_word"'));
 const workspace=fs.readFileSync('app/api/teacher/student-workspace/route.ts','utf8');
 assert.ok(workspace.includes('.in("status", REVIEW_ATTENTION_STATUSES)'));
});

test('Main/Alternative promotion preserves row, dictionary/book forms, book review history and Library SRS identity',async()=>{
 const db=await fixture();try{
 const promotion=fs.readFileSync('sql/20261013_alternative_spelling_promotion.sql','utf8');
 await db.exec(promotion);
 await db.exec(fs.readFileSync('sql/20260430_library_word_progress.sql','utf8').replace(/create extension if not exists pgcrypto;/g,''));
 await db.exec(`alter table user_book_words add column book_form text;
 create table study_logs(id uuid primary key,user_book_word_id uuid references user_book_words,result text);
 insert into user_book_words(id,user_book_id,surface,alternative_surface,reading,meaning,base_form,book_form,vocabulary_cache_id,target_language_code)
 values('${id(20)}','${id(5)}','読む','讀む','よむ','to read','読む','讀んでいた',123,'ja');
 insert into study_logs values('${id(21)}','${id(20)}','correct');
 insert into user_library_word_progress(user_id,study_identity_key,surface,reading,reading_gate_status,meaning_gate_status,mastered,reading_gate_attempts)
 values('${id(2)}','読む||よむ','読む','よむ','passed','passed',true,7);`);
 const before=(await db.query('select * from user_book_words where id=$1',[id(20)])).rows[0];
 const history=await rows(db,'user_library_word_progress');
 await db.query('update user_book_words set surface=alternative_surface,alternative_surface=surface where id=$1',[id(20)]);
 const after=(await db.query('select * from user_book_words where id=$1',[id(20)])).rows[0];
 assert.equal(after.surface,'讀む');assert.equal(after.alternative_surface,'読む');assert.equal(after.study_identity_key,'読む||よむ');
 for(const field of ['id','user_book_id','reading','meaning','base_form','book_form','vocabulary_cache_id','created_at','excluded_from_flashcards']) assert.deepEqual(after[field],before[field],field);
 assert.deepEqual(await rows(db,'user_library_word_progress'),history);assert.equal((await rows(db,'study_logs'))[0].user_book_word_id,id(20));
 const summary=(await rows(db,'user_library_word_summaries'))[0];assert.equal(summary.study_identity_key,'読む||よむ');assert.equal(summary.surface,'讀む');assert.equal((await rows(db,'user_book_words')).length,1);
 // Editing the alternative alone never promotes it.
 await db.exec(`update user_book_words set alternative_surface='読ム' where id='${id(20)}';`);
 assert.equal((await rows(db,'user_book_words'))[0].surface,'讀む');
 // Teacher editor uses the linked row and the same semantics, without inserting an item.
 await db.exec(`insert into teacher_book_vocabulary(id,linked_user_book_word_id,surface,alternative_surface) values('${id(22)}','${id(20)}','讀む','読ム');
 update teacher_book_vocabulary set surface=alternative_surface,alternative_surface=surface where id='${id(22)}';`);
 const teacherSaved=(await rows(db,'user_book_words'))[0];assert.equal(teacherSaved.surface,'読ム');assert.equal(teacherSaved.alternative_surface,'讀む');assert.equal(teacherSaved.book_form,'讀んでいた');
 assert.deepEqual(await rows(db,'user_library_word_progress'),history);assert.equal((await rows(db,'user_book_words')).length,1);
 // Reader promotion keeps an existing teacher association in sync too.
 await db.exec(`update user_book_words set surface=alternative_surface,alternative_surface=surface where id='${id(20)}';`);
 const readerSynced=(await rows(db,'teacher_book_vocabulary'))[0];assert.equal(readerSynced.surface,'讀む');assert.equal(readerSynced.alternative_surface,'読ム');
 assert.deepEqual(await rows(db,'user_library_word_progress'),history);assert.equal((await rows(db,'user_book_words')).length,1);
 await db.exec(promotion);assert.equal((await rows(db,'user_book_words'))[0].surface,'讀む');
 }finally{await db.close();}
});

test('promotion migration leaves ambiguous historical forms untouched; swap does not mark a new encounter or reset exclusion',async()=>{
 const db=await fixture();try{
 await db.exec(`insert into user_book_words(id,user_book_id,surface,base_form,reading,meaning,target_language_code,seen_on,excluded_from_flashcards) values('${id(30)}','${id(5)}','讀む','読む','よむ','to read','ja','2020-01-01',true);`);
 const before=(await rows(db,'user_book_words'))[0];
 await db.exec(fs.readFileSync('sql/20261013_alternative_spelling_promotion.sql','utf8'));
 const historical=(await rows(db,'user_book_words'))[0];
 for(const [field,value] of Object.entries(before)) assert.deepEqual(historical[field],value,field);
 assert.equal(historical.alternative_surface,null);assert.equal(historical.study_identity_key,null);
 await db.exec(`update user_book_words set surface='読む',alternative_surface='讀む',seen_on=current_date,excluded_from_flashcards=false where id='${id(30)}';`);
 const swapped=(await rows(db,'user_book_words'))[0];assert.equal(swapped.surface,'読む');assert.equal(swapped.alternative_surface,'讀む');assert.deepEqual(swapped.seen_on,before.seen_on);assert.equal(swapped.excluded_from_flashcards,true);
 }finally{await db.close();}
});
