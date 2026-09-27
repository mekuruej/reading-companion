import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
function load(file) {
  const mod = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
  new Function('require','module','exports',code)(name => name.startsWith('.') ? load(path.join(path.dirname(file),name+'.ts')) : require(name),mod,mod.exports);
  return mod.exports;
}
const p=load('lib/books/readingProgress.ts');
const {normalizeSessionPayload}=load('lib/books/readingSessionPayload.ts');
const book={edition_format:'audiobook',audiobook_duration_minutes:555,page_count:300,kindle_location_count:6000};
test('audio uses published timeline total and human readable hours/minutes',()=>{
  assert.equal(p.effectiveProgressMethod('page',book),'audiobook_time');
  assert.equal(p.effectiveProgressMethod('page',{edition_format:'paperback'}),'page');
  assert.equal(p.completionPercent(222,'audiobook_time',book),40);
  assert.equal(p.formatProgressPosition(222,'audiobook_time'),'3 hr 42 min');
  assert.equal(p.sessionProgressLabel(p.progressPayload('audiobook_time',null,222,555)),'Audio position: 3 hr 42 min');
  assert.equal(p.completionPercent(222,'audiobook_time',{page_count:300}),null);
});
test('latest position handles rewind and ignores later sessions without a position',()=>{
  const entries=[
    {...p.progressPayload('audiobook_time',null,250,555),read_on:'2026-09-25',created_at:'2026-09-25T10:00:00Z',minutes_read:30,session_mode:'listening'},
    {...p.progressPayload('audiobook_time',null,222,555),read_on:'2026-09-25',created_at:'2026-09-25T11:00:00Z',minutes_read:25,session_mode:'listening'},
    {...p.progressPayload('audiobook_time',null,null,555),read_on:'2026-09-26',minutes_read:20,session_mode:'listening'},
    {tracking_unit:'page',end_page:300,read_on:'2026-09-27'},
  ];
  const summary=p.progressSummary(entries,'audiobook_time',book);
  assert.equal(summary.position,222);assert.equal(summary.percent,40);
  assert.equal(summary.rate,null);assert.equal(summary.remainingMinutes,null);assert.equal(summary.totalDistance,0);
  assert.equal(entries.reduce((sum,s)=>sum+(s.minutes_read??0),0),75);
});
test('listening duration and position are independent; unknown total and untimed updates work',()=>{
  const result=normalizeSessionPayload({session_mode:'listening',minutes_read:25,end_position:222},{books:book});
  assert.equal(result.end_position,222);assert.equal(result.minutes_read,25);assert.equal(result.progress_total,555);
  assert.equal(result.start_page,null);assert.equal(result.end_page,null);
  assert.equal(normalizeSessionPayload({end_position:222},{books:{edition_format:'audiobook'}}).progress_total,null);
  assert.equal(normalizeSessionPayload({minutes_read:30,session_mode:'listening'},{books:book}).end_position,null);
  assert.equal(normalizeSessionPayload({end_position:222},{books:book}).minutes_read,null);
  assert.equal(normalizeSessionPayload({end_position:12},{books:book},{tracking_unit:'page',progress_total:300}).tracking_unit,'page');
});
test('audio positions reject invalid values and never accept page/location prefixes',()=>{
  for(const raw of ['-1','1.5','NaN','Infinity','556','loc 20','20%','3:42']) assert.ok(p.parseProgressPosition(raw,'audiobook_time',555).error,raw);
  assert.equal(p.parseProgressPosition('0','audiobook_time',555).value,0);
  assert.equal(p.parseProgressPosition('555','audiobook_time',555).value,555);
});
test('hours/minutes inputs convert correctly without asking for total minutes',()=>{
  const Input=load('components/books/AudioTimeInput.tsx').default;
  const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
  let result;
  const inputs=nodes(Input({value:'222',onChange:v=>result=v})).filter(n=>n.type==='input');
  assert.equal(inputs[0].props.value,3);assert.equal(inputs[1].props.value,42);
  inputs[0].props.onChange({target:{value:'4'}});assert.equal(result,'282');
  inputs[1].props.onChange({target:{value:'10'}});assert.equal(result,'190');
  inputs[1].props.onChange({target:{value:'60'}});assert.equal(result,'190');
});
test('SQL migration is rerunnable, preserves history and validates audio snapshots', {skip:!process.env.PGLITE_MODULE}, async()=>{
  const {PGlite}=await import(process.env.PGLITE_MODULE);const db=new PGlite();
  try {
    await db.exec(`create table books(id integer primary key,page_count integer,edition_format text);
    create table user_books(id integer primary key,book_id integer references books,progress_mode text);
    create table user_book_reading_sessions(id integer generated always as identity primary key,user_book_id integer references user_books,start_page numeric,end_page numeric,minutes_read numeric);
    insert into books values(1,300,'audiobook');insert into user_books values(1,1,'page');
    insert into user_book_reading_sessions(user_book_id,start_page,end_page,minutes_read) values(1,1,20,25);`);
    await db.exec(fs.readFileSync(path.join(root,'sql/20260921_reader_progress_tracking.sql'),'utf8'));
    const before=(await db.query('select * from user_book_reading_sessions')).rows;
    const migration=fs.readFileSync(path.join(root,'sql/20260927_audiobook_progress.sql'),'utf8');
    await db.exec(migration);await db.exec(migration);
    assert.deepEqual((await db.query('select * from user_book_reading_sessions')).rows,before);
    await db.exec("update books set audiobook_duration_minutes=555; update user_books set progress_tracking_method='audiobook_time';");
    await db.exec("insert into user_book_reading_sessions(user_book_id,tracking_unit,end_position,minutes_read) values(1,'audiobook_time',222,25)");
    const audio=(await db.query('select * from user_book_reading_sessions where id=2')).rows[0];
    assert.equal(Number(audio.progress_total),555);assert.equal(Number(audio.end_position),222);assert.equal(Number(audio.minutes_read),25);assert.equal(audio.end_page,null);
    await assert.rejects(db.exec("insert into user_book_reading_sessions(user_book_id,tracking_unit,end_position) values(1,'audiobook_time',556)"),/exceeds/);
    await assert.rejects(db.exec("insert into user_book_reading_sessions(user_book_id,tracking_unit,end_position) values(1,'audiobook_time',1.5)"),/whole/);
    await assert.rejects(db.exec("update user_book_reading_sessions set tracking_unit='audiobook_time' where id=1"),/original tracking unit/);
    await assert.rejects(db.exec('update books set audiobook_duration_minutes=0'),/check constraint/);
    await db.exec('update books set audiobook_duration_minutes=null');
    await db.exec("insert into user_book_reading_sessions(user_book_id,tracking_unit,end_position) values(1,'audiobook_time',600)");
    const unknown=(await db.query('select * from user_book_reading_sessions order by id desc limit 1')).rows[0];
    assert.equal(unknown.progress_total,null);assert.equal(unknown.minutes_read,null);
    assert.equal((await db.query('select page_count from books')).rows[0].page_count,300);
  } finally {await db.close();}
});
