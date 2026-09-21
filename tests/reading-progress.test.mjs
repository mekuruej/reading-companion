import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const runtimeRequire = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cache = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} }; cache.set(filename, mod);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }}).outputText;
  const localRequire = name => name.startsWith('@/') ? load(name.slice(2) + '.ts') : name.startsWith('.') ? load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name)) + '.ts') : runtimeRequire(name);
  new Function('require', 'module', 'exports', source)(localRequire, mod, mod.exports);
  return mod.exports;
}
const p = load('lib/books/readingProgress.ts');
const { normalizeSessionPayload } = load('lib/books/readingSessionPayload.ts');
const { getOrCreateUserBook } = load('lib/books/userBookWorkspace.ts');
const totals = { page_count: 200, kindle_location_count: 4000 };
for (const [method, position, expected] of [['page', 50, 25], ['kindle_location', 1000, 25], ['percent', 37.5, 37.5]]) {
  test(`${method}: completion uses its matching total`, () => assert.equal(p.completionPercent(position, method, totals), expected));
}
test('missing matching totals never use the other unit', () => {
  assert.equal(p.completionPercent(50, 'page', {kindle_location_count:4000}), null);
  assert.equal(p.completionPercent(1000, 'kindle_location', {page_count:200}), null);
  assert.equal(p.completionPercent(40, 'percent', {}), 40);
});
test('positions validate whole numbers, bounds, wrong units and zero', () => {
  for (const method of ['page','kindle_location']) {
    for (const value of ['-1','1.5','NaN','Infinity','20%','101','9007199254740992']) assert.ok(p.parseProgressPosition(value,method,100).error, `${method}: ${value}`);
    assert.equal(p.parseProgressPosition('0',method,100).value,0);
    assert.equal(p.parseProgressPosition('10000',method,null).value,10000);
  }
  for (const value of ['101%','-0.1','NaN']) assert.ok(p.parseProgressPosition(value,'percent',100).error);
  assert.equal(p.parseProgressPosition('12.5%','percent',100).value,12.5);
  assert.ok(p.parseProgressRange('40','30','page',200).error);
  assert.ok(p.parseProgressRange('40','','page',200).error);
});
test('mixed history keeps original labels, units and rates', () => {
  const sessions = [
    {...p.progressPayload('page',1,20,200),minutes_read:20},
    {...p.progressPayload('kindle_location',100,300,4000),minutes_read:30},
    {...p.progressPayload('percent',10,20,100),minutes_read:10},
  ];
  assert.equal(p.sessionProgressLabel(sessions[0]),'Page: 1 → 20');
  assert.equal(p.sessionProgressLabel(sessions[1]),'Location: 100 → 300');
  assert.equal(p.sessionProgressLabel(sessions[2]),'Percent: 10% → 20%');
  assert.equal(p.progressSummary(sessions,'page',totals).rate,60);
  assert.equal(p.progressSummary(sessions,'kindle_location',totals).rate,400);
  assert.equal(p.progressSummary(sessions,'percent',totals).rate,60);
  assert.equal(p.progressSummary(sessions,'kindle_location',{}).remainingMinutes,null);
  assert.equal(p.progressSummary(sessions,'kindle_location',{}).percent,null);
  assert.equal(p.progressSummary(sessions,'kindle_location',{}).position,300);
});
test('page regressions: legacy units, inclusive counts and next start', () => {
  const old = {start_page:1,end_page:10,minutes_read:10};
  assert.equal(p.sessionProgressUnit(old),'page');
  assert.equal(p.sessionDistance(old),10);
  assert.equal(p.nextProgressStart(10,'page',200),'11');
  assert.equal(p.nextProgressStart(10,'kindle_location',4000),'10');
  assert.equal(p.nextProgressStart(10,'percent',100),'10');
  assert.equal(p.nextProgressStart(200,'page',200),'200');
  assert.equal(p.sessionDistance({start_page:null,end_page:null}),null);
});
test('new non-page entries never populate legacy page columns', () => {
  for (const method of ['kindle_location','percent']) {
    const entry = normalizeSessionPayload({start_position:10,end_position:20,read_on:'2026-09-21'}, {progress_tracking_method:method,books:totals});
    assert.equal(entry.start_page,null); assert.equal(entry.end_page,null);
    assert.equal(entry.tracking_unit,method); assert.equal(entry.end_position,20);
  }
});
test('editing keeps original unit and total after preference/catalog changes', () => {
  const book = {progress_tracking_method:'kindle_location',books:{page_count:10,kindle_location_count:1000}};
  const old = {tracking_unit:'page',progress_total:200};
  const edited = normalizeSessionPayload({start_position:20,end_position:30},book,old);
  assert.equal(edited.tracking_unit,'page'); assert.equal(edited.progress_total,200);
  assert.throws(() => normalizeSessionPayload({tracking_unit:'kindle_location',end_position:30},book,old), /original unit/);
  assert.equal(normalizeSessionPayload({end_position:300},book,{tracking_unit:'page',progress_total:null}).progress_total,null);
});
test('invalid API progress is rejected before writing', () => {
  assert.throws(() => normalizeSessionPayload({end_position:5},{books:totals}),/Choose/);
  assert.throws(() => normalizeSessionPayload({tracking_unit:'bad'},{books:totals}),/Invalid/);
  assert.throws(() => normalizeSessionPayload({end_position:101},{progress_tracking_method:'percent'}),/exceed/);
  assert.throws(() => normalizeSessionPayload({tracking_unit:'kindle_location',end_page:10},{books:totals}),/page columns/);
  assert.throws(() => normalizeSessionPayload({minutes_read:-1},{progress_tracking_method:'page'}),/positive/);
});
function fakeDatabase(existing = null) {
  const state = { row: existing, inserts:0 };
  return {state, from(table) { return {
    select(){return this}, eq(){return this},
    maybeSingle:async()=>({data:table === "profiles" ? {id:"student"} : state.row,error:null}),
    insert(row){state.row={id:'reader-copy',...row};state.inserts++;return this},
    update(patch){Object.assign(state.row,patch);return this},
    single:async()=>({data:state.row,error:null}),
    then(resolve){resolve({data:state.row,error:null})},
  }}};
}
for (const status of ['reading','want_to_read']) {
  test(`initial add as ${status}: persisted status determines prompt`,async()=> {
    const db=fakeDatabase();
    await getOrCreateUserBook({supabase:db,userId:'reader',bookId:'edition',initialPersonalTrackingStatus:status});
    assert.equal(p.shouldPromptProgress(db.state.row),status==='reading');
    assert.equal(db.state.row.personal_tracking_status,status);
    db.state.row.progress_tracking_method='kindle_location';
    await getOrCreateUserBook({supabase:db,userId:'reader',bookId:'edition'});
    assert.equal(db.state.inserts,1);
    assert.equal(db.state.row.progress_tracking_method,'kindle_location');
    assert.equal(p.shouldPromptProgress(db.state.row),false);
  });
}
test('Want to Read transition and existing reader fallback prompt once',()=> {
  const row={personal_tracking_status:'want_to_read'};
  assert.equal(p.shouldPromptProgress(row),false);
  row.personal_tracking_status='reading';
  assert.equal(p.shouldPromptProgress(row),true);
  assert.equal(p.shouldPromptProgress({status:'reading'}),true);
  assert.equal(p.shouldPromptProgress({started_at:'2026-09-20'}),true);
  assert.equal(p.shouldPromptProgress({...row,progress_tracking_method:'percent'}),false);
  assert.equal(p.shouldPromptProgress({...row,personal_tracking_status:'finished'}),false);
});
const { applyAddBookDestinations } = load('lib/books/addBookDestinations.ts');
for (const status of ['reading','want_to_read']) {
  test(`Add Book destination service forwards ${status} to the reader's copy`, async () => {
    const db=fakeDatabase();
    const result=await applyAddBookDestinations({supabase:db,authUserId:'reader',actorProfile:{role:'member'},bookId:'edition',input:{mode:'add_to_library',initialPersonalTrackingStatus:status}});
    assert.equal(result.userBookId,'reader-copy');
    assert.equal(db.state.row.personal_tracking_status,status);
    assert.equal(p.shouldPromptProgress(db.state.row),status==='reading');
  });
}
test('adding to a student does not impose the teacher’s personal reading choice', async () => {
  const db=fakeDatabase();
  await applyAddBookDestinations({supabase:db,authUserId:'teacher',actorProfile:{role:'super_teacher'},bookId:'edition',input:{initialPersonalTrackingStatus:'reading',targetUserId:'student',destinations:{studentLibrary:true,myLibrary:false,teachingBooks:false}}});
  assert.equal(db.state.row.user_id,'student');
  assert.equal(db.state.row.personal_tracking_status,'want_to_read');
});
test('existing teaching workspace promoted to reading receives a start date and prompts', async()=> {
  const db=fakeDatabase({id:'reader-copy',personal_tracking_status:'not_tracking'});
  await getOrCreateUserBook({supabase:db,userId:'reader',bookId:'edition',initialPersonalTrackingStatus:'reading'});
  assert.match(db.state.row.started_at,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(p.shouldPromptProgress(db.state.row),true);
});
const timer = load('app/(protected)/books/[userBookId]/_shared/timed-session/timedSessionPersistence.ts');
test('timer storage round-trips the draft unit with elapsed time',()=> {
  const storage=new Map();
  globalThis.window={localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}};
  try {
    const state={version:1,sessionMode:'fluid',userBookId:'reader-copy',trackingUnit:'kindle_location',startedAt:null,accumulatedElapsedMs:120000,isPaused:true,sessionDate:'2026-09-21',sessionStartPage:'100',sessionEndPage:'200',showTimedSessionForm:true,savedAt:0};
    timer.writePersistedTimedSession(state);
    const restored=timer.readPersistedTimedSession('fluid','reader-copy');
    assert.equal(restored.trackingUnit,'kindle_location');
    assert.equal(restored.sessionEndPage,'200');
    assert.equal(timer.elapsedMsForPersistedTimedSession(restored),120000);
    assert.equal(timer.readPersistedTimedSession('fluid','another-copy'),null);
  } finally { delete globalThis.window; }
});

test('Book Hub reached position follows Kindle sessions beyond legacy page history', () => {
  const filename = path.resolve(__dirname, '../app/(protected)/books/[userBookId]/page.tsx');
  const ast = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['bookHubLastPosition', 'bookHubLastPageLabel'];
  const declarations = new Map();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(ast))) declarations.set(node.name.getText(ast), node.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const code = ts.transpileModule(names.map(name => `const ${declarations.get(name)};`).join('\n'), {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  const label = new Function('trackedProgress', 'tracking', 'canSeeVocabularySummary', 'lastSavedWordPage', 'isNativeAudiobook', 'progressLabels', `${code}; return bookHubLastPageLabel;`);
  const sessions = [
    {tracking_unit:'page', start_page:28, end_page:37, minutes_read:24},
    {tracking_unit:'kindle_location', start_position:38, end_position:52, start_page:null, end_page:null, minutes_read:25},
  ];
  const summary = p.progressSummary(sessions, 'kindle_location', {kindle_location_count:196});
  assert.equal(label(summary, {method:'kindle_location'}, true, 37, false, p.progressLabels), 'Location 52');
  assert.equal(summary.percent, 26.5);
  assert.equal(summary.rate, 33.6);
  assert.equal(label({position:null}, {method:'kindle_location'}, true, 37, false, p.progressLabels), '');
  assert.equal(label({position:null}, {method:'page'}, true, 37, false, p.progressLabels), 'Page 37');
  assert.equal(label({position:0}, {method:'percent'}, true, 37, false, p.progressLabels), 'Percent 0%');
});

test('location hub averages use matching reading distances and only paired timed minutes', () => {
  const location = (start, end, extra = {}) => ({...p.progressPayload('kindle_location', start, end, 4000), ...extra});
  const sessions = [
    location(100, 300, {minutes_read: 30}),
    location(300, 400),
    location(null, 500, {minutes_read: 60}),
    location(400, 800, {minutes_read: 20, session_mode: 'listening'}),
    location(0, 100, {is_filler: true}),
    {...p.progressPayload('page', 1, 20, 200), minutes_read: 50},
  ];
  const summary = p.progressSummary(sessions, 'kindle_location', totals);
  assert.equal(summary.totalDistance, 300);
  assert.equal(summary.averageMinutesPerUnit, 0.15);
  assert.equal(summary.rate, 400);
  for (const entries of [[], [location(100, 100, {minutes_read: 10})], [location(100, 200)]]) {
    assert.equal(p.progressSummary(entries, 'kindle_location', totals).averageMinutesPerUnit, null);
  }
});
