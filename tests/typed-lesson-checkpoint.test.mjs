import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('typed checkpoint migration preserves historical pages/notes, is repeatable, and validates storage',async()=>{
 const db=new PGlite();try {
  await db.exec(`create table live_lesson_capture_sessions(id int primary key,stopping_page_number integer,stopping_text text,stopping_point_saved_at timestamptz,status text);
  insert into live_lesson_capture_sessions values(1,42,'old note','2026-01-01','deferred'),(2,null,'note only','2026-01-02','completed'),(3,null,null,null,'capturing');`);
  await db.exec(`alter table live_lesson_capture_sessions add column updated_at timestamptz default '2026-01-01T00:00:00Z';
  create function bump_lesson_time() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
  create trigger set_live_lesson_capture_sessions_updated_at before update on live_lesson_capture_sessions for each row execute function bump_lesson_time();`);
  const migration=fs.readFileSync('sql/20261015_typed_lesson_stopping_points.sql','utf8');
  await db.exec(migration);await db.exec(migration);
  const rows=(await db.query('select * from live_lesson_capture_sessions order by id')).rows;
  assert.equal(rows.length,3);assert.equal(new Date(rows[0].updated_at).toISOString(),'2026-01-01T00:00:00.000Z');assert.equal(Number(rows[0].stopping_value),42);assert.equal(rows[0].stopping_unit,'page');assert.equal(rows[0].stopping_text,'old note');assert.equal(rows[0].status,'deferred');
  assert.equal(rows[1].stopping_unit,null);assert.equal(rows[1].stopping_text,'note only');assert.equal(rows[2].stopping_value,null);
  for(const [unit,value] of [['kindle_location',1867],['percent',38.5],['percent',0],['percent',100]]) {
   await db.query('update live_lesson_capture_sessions set stopping_unit=$1,stopping_value=$2,stopping_page_number=null where id=3',[unit,value]);
   assert.equal((await db.query('select stopping_unit from live_lesson_capture_sessions where id=3')).rows[0].stopping_unit,unit);
  }
  for(const [unit,value] of [['percent',101],['page',1.5],['kindle_location',-1],['wrong',42],[null,42],['page',null]]) {
   await assert.rejects(db.query('update live_lesson_capture_sessions set stopping_unit=$1,stopping_value=$2 where id=3',[unit,value]));
  }
  await db.exec(migration);assert.equal((await db.query('select stopping_unit from live_lesson_capture_sessions where id=3')).rows[0].stopping_unit,'percent');
 } finally {await db.close();}
});

test('checkpoint UI is target-typed, explicit, and offers progress separately after saving',()=>{
 const source=fs.readFileSync('app/(protected)/teacher/students/[studentId]/books/[userBookId]/lesson-add/LiveLessonQuickAddPanel.tsx','utf8');
 const open=source.slice(source.indexOf('function openStoppingPointPrompt'),source.indexOf('async function transitionSession'));
 assert.ok(open.includes('suggestLessonStoppingPoint(capturedWords, checkpointUnit'));
 assert.ok(!open.includes('currentPage'));assert.ok(!open.includes('sourceUserBookId'));assert.ok(!open.includes('fetch('));
 assert.ok(source.includes('targetStoppingUnit(studentBook?.progress_tracking_method'));
 assert.ok(source.includes('stoppingUnit: checkpointUnit'));assert.ok(source.includes('saveStoppingPoint: true'));
 assert.ok(source.includes('stoppingPointLabel(latestStoppingPoint)'));assert.ok(source.includes('actionLabel="Update student reading progress"'));
 const prompt=source.slice(source.indexOf('<VocabularyProgressPrompt'),source.indexOf('actionLabel="Update student reading progress"'));
 assert.ok(prompt.includes('userBookId={userBookId} studentId={studentId}'));assert.ok(!prompt.includes('sourceUserBookId'));assert.ok(!prompt.includes('autoOpen'));
 const workspace=fs.readFileSync('app/(protected)/teacher/students/[studentId]/workspace/page.tsx','utf8');assert.ok(workspace.includes('Stopped at: {lessonBook.checkpoint.label'));
 const api=fs.readFileSync('app/api/teacher/student-workspace/route.ts','utf8');assert.ok(api.includes('stoppingPointLabel(readStoppingPoint(row))'));assert.ok(api.includes('checkpoints.get(row.user_book_id)'));
});
