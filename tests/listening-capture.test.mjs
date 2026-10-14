import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const migration=fs.readFileSync('sql/20261014_listening_capture.sql','utf8');
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role authenticated; create role anon; create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.actor_id',true),'')::uuid$$;
 create table auth.users(id uuid primary key);
 create table books(id uuid primary key,page_count integer,kindle_location_count integer,audiobook_duration_minutes integer);
 create table user_books(id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,book_id uuid references books);
 create table user_book_words(id uuid primary key,surface text);
 create table user_library_word_progress(id uuid primary key,mastered boolean);
 create table user_book_reading_sessions(id uuid primary key default gen_random_uuid(),user_book_id uuid not null references user_books on delete cascade,read_on date not null default current_date,start_page integer,end_page integer,minutes_read integer check(minutes_read>0),created_at timestamptz not null default now(),is_filler boolean not null default false,session_mode text not null default 'curiosity' check(session_mode in ('curiosity','fluid','listening')),tracking_unit text check(tracking_unit in ('page','kindle_location','percent','audiobook_time')),start_position numeric,end_position numeric,progress_total numeric,ending_phrase text check(length(ending_phrase)<=500));
 alter table user_books enable row level security;
 create policy owner_book on user_books for select using(user_id=auth.uid());
 alter table user_book_reading_sessions enable row level security;
 create policy own_history on user_book_reading_sessions for all using(exists(select 1 from user_books b where b.id=user_book_id and b.user_id=auth.uid()));
 grant usage on schema public,auth to authenticated; grant select on user_books to authenticated; grant all on user_book_reading_sessions to authenticated;
 insert into auth.users values('${id(1)}'),('${id(2)}');
 insert into books values('${id(30)}',300,4000,600);
 insert into user_books values('${id(3)}','${id(1)}','${id(30)}'),('${id(4)}','${id(2)}','${id(30)}');
 insert into user_book_words values('${id(20)}','歴史');insert into user_library_word_progress values('${id(21)}',true);`);
 const progressSql=fs.readFileSync('sql/20260927_audiobook_progress.sql','utf8');
 await db.exec(progressSql.slice(progressSql.indexOf('create or replace function public.validate_reading_progress_units()'),progressSql.indexOf('-- The shared vocabulary')));
 await db.exec('create trigger validate_reading_progress_units before insert or update on user_book_reading_sessions for each row execute function validate_reading_progress_units();');
 await db.exec(migration);
 await db.exec(`set role authenticated;set app.actor_id='${id(1)}';`);
 return db;
}
const start=(db,s=5,b=3)=>db.query('select * from start_listening_capture($1,$2,now())',[id(s),id(b)]);
const save=(db,w=6,s=5)=>db.query('select * from save_listening_word($1,$2,$3)',[id(s),id(w),JSON.stringify({surface:'聞く',reading:'きく',meaning:'hear',alternative_surface:'聴く'})]);
const finish=(db,s=5,p={})=>db.query('select finish_listening_capture($1,$2) as id',[id(s),JSON.stringify({read_on:'2026-10-14',minutes_read:3,tracking_unit:'page',end_page:12,end_position:12,ending_phrase:'ここまで',...p})]);
const rows=async(db,t)=>(await db.query(`select * from ${t}`)).rows;
test('isolated SQL: start/save/finish retries are idempotent, history preserves captured words, new sessions are separate',async()=>{
 const db=await fixture();try{
 await start(db);await start(db);await save(db);await save(db);
 assert.equal((await rows(db,'listening_session_words')).length,1);
 const a=(await finish(db)).rows[0].id;assert.equal((await finish(db)).rows[0].id,a);
 assert.equal((await rows(db,'user_book_reading_sessions')).length,1);
 assert.equal((await rows(db,'listening_session_words'))[0].meaning,'hear');
 await save(db);await assert.rejects(save(db,7),/completed/);
 await start(db,8);await save(db,9,8);assert.equal((await rows(db,'listening_capture_sessions')).length,2);
 await db.exec('reset role');assert.deepEqual((await rows(db,'user_book_words')).map(w=>w.surface),['歴史']);assert.equal((await rows(db,'user_library_word_progress'))[0].mastered,true);
 }finally{await db.close();}
});
test('isolated SQL: stranger cannot read, mutate, forge owner/book, save, or finalize another user capture',async()=>{
 const db=await fixture();try{
 await start(db);await save(db);await db.exec(`set app.actor_id='${id(2)}';`);
 assert.equal((await rows(db,'listening_capture_sessions')).length,0);assert.equal((await rows(db,'listening_session_words')).length,0);
 await assert.rejects(start(db,8,3),/book owner/);await assert.rejects(start(db,5,4),/Invalid/);
 await assert.rejects(save(db),/Invalid/);await assert.rejects(finish(db),/Invalid/);
 for(const sql of [`update listening_session_words set meaning='x'`,`delete from listening_session_words`,`insert into listening_capture_sessions(id,user_id,user_book_id,started_at) values('${id(8)}','${id(2)}','${id(4)}',now())`]) await assert.rejects(db.exec(sql),/permission denied/);
 await db.exec('set role anon');await assert.rejects(start(db),/permission denied/);
 }finally{await db.close();}
});
test('isolated SQL: failure rolls back finalization; retry preserves identity and creates only one history record',async()=>{
 const db=await fixture();try{
 await start(db);await save(db);await assert.rejects(finish(db,5,{ending_phrase:'x'.repeat(501)}),/check constraint/);
 assert.equal((await rows(db,'user_book_reading_sessions')).length,0);assert.equal((await rows(db,'listening_capture_sessions'))[0].completed_at,null);
 await finish(db);assert.equal((await rows(db,'user_book_reading_sessions')).length,1);
 }finally{await db.close();}
});
test('isolated SQL: session deletion cascades captures; book deletion cascades active and completed captures',async()=>{
 const db=await fixture();try{
 await start(db);await save(db);const h=(await finish(db)).rows[0].id;
 await assert.rejects(db.query("update user_book_reading_sessions set session_mode='fluid' where id=$1",[h]),/reclassified/);
 await db.query('delete from user_book_reading_sessions where id=$1',[h]);assert.equal((await rows(db,'listening_session_words')).length,0);assert.equal((await rows(db,'listening_capture_sessions')).length,0);
 await start(db,8);await save(db,9,8);await start(db,10);await save(db,11,10);await finish(db,10);
 await db.exec(`reset role;delete from user_books where id='${id(3)}';`);
 assert.equal((await rows(db,'listening_session_words')).length,0);assert.equal((await rows(db,'listening_capture_sessions')).length,0);
 }finally{await db.close();}
});
test('isolated SQL: teacher-like history access does not expose captures or permit deletion',async()=>{
 const db=await fixture();try{
 await start(db);await save(db);const h=(await finish(db)).rows[0].id;
 await db.exec(`reset role;create policy teacher_book on user_books for select using(true);create policy teacher_history on user_book_reading_sessions for all using(true);set role authenticated;set app.actor_id='${id(2)}';`);
 assert.equal((await rows(db,'user_book_reading_sessions')).length,1);assert.equal((await rows(db,'listening_session_words')).length,0);
 await assert.rejects(db.query('delete from user_book_reading_sessions where id=$1',[h]),/Only the owner/);
 }finally{await db.close();}
});

test('isolated SQL: real progress validator rejects invalid positions and preserves percent/audio units',async()=>{
 const db=await fixture();try{
 await start(db);await assert.rejects(finish(db,5,{end_page:301,end_position:301}),/exceeds/);
 assert.equal((await rows(db,'user_book_reading_sessions')).length,0);
 await finish(db,5,{tracking_unit:'percent',end_page:null,end_position:45.5});
 const percent=(await rows(db,'user_book_reading_sessions'))[0];assert.equal(percent.progress_total,'100');assert.equal(percent.end_page,null);
 await start(db,8);await finish(db,8,{tracking_unit:'audiobook_time',end_page:null,end_position:120});
 assert.equal((await rows(db,'user_book_reading_sessions')).find(s=>s.tracking_unit==='audiobook_time').end_position,'120');
 }finally{await db.close();}
});
