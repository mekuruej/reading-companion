// Read-only mocked route regression checks. Never connects to Supabase.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let state;
function query(table) {
  const filters = []; let op = 'select', patch;
  const q = new Proxy({}, { get(_, key) {
    if (key === 'then') return (resolve, reject) => Promise.resolve().then(() => {
      state.calls.push({ table, op, filters: [...filters], patch });
      if (state.fail === table) return { data: null, error: { message: 'Unavailable' } };
      const rows = (state.tables[table] || []).filter(row => filters.every(([k,v]) => row[k] === v));
      if (op === 'delete') state.tables[table] = (state.tables[table] || []).filter(row => !rows.includes(row));
      if (op === 'update') rows.forEach(row => Object.assign(row, patch));
      return { data: table === 'user_books' ? rows[0] || null : rows, error: null };
    }).then(resolve,reject);
    return (...args) => { if (key === 'eq') filters.push(args); if (key === 'delete') op = 'delete'; if (key === 'update') { op = 'update'; patch = args[0]; } return q; };
  }});
  return q;
}
const db = { from: query, auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) } };
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, process: { env: {} }, console: { error() {} }, require(id) {
    if (id === '@supabase/supabase-js') return { createClient: () => db };
    if (id === 'next/server') return { NextResponse: { json: (body, opts) => ({ body, status: opts?.status || 200 }) } };
    if (id === '@/lib/teacher/teachingRetention') return load('lib/teacher/teachingRetention.ts');
    return require(id);
  }});
  return module.exports;
}
const { POST } = load('app/api/books/[userBookId]/remove-from-library/route.ts');
const children = ['user_word_collocations','study_logs','user_study_events','user_alerts','user_book_detective_entries','user_book_characters','user_book_chapter_summaries','user_book_reading_sessions','learning_tasks','user_book_words','user_book_reviews','user_book_setting_items','user_book_cultural_items'];
function reset() { state = { calls: [], tables: { user_books: [{ id:'copy',user_id:'owner',book_id:'book',personal_tracking_status:'reading',favorite_quotes:'quote',notes:'notes',rating_overall:4,started_at:'2026-01-01',finished_at:null }] } }; for(const table of children) state.tables[table] = [{ id:table,user_book_id:'copy',content:'preserve' }]; }
async function invoke() { return POST({ headers: { get: () => 'Bearer test' } }, { params: Promise.resolve({userBookId:'copy'}) }); }
(async () => {
  const deps = [
    ['teacher_books',{id:'teaching',teacher_id:'owner',book_id:'book',user_book_id:'copy'}],
    ['teacher_books',{id:'teaching',teacher_id:'owner',book_id:'book',user_book_id:null}],
    ['teacher_books',{id:'teaching',teacher_id:'owner',book_id:'book',user_book_id:'wrong'}],
    ['teacher_books',{id:'teaching',teacher_id:'another',book_id:'different',user_book_id:'copy'}],
    ['teacher_book_prep_items',{id:'prep',teacher_id:'owner',book_id:'book'}],
    ['teacher_book_vocabulary',{id:'vocab',teacher_id:'owner',book_id:'book'}],
    ['teacher_notebook_entry_contexts',{id:'context',user_book_id:'copy'}],
    ['teacher_notebook_word_lists',{id:'list',teacher_id:'owner',book_id:'book'}],
    ['teacher_student_lesson_books',{id:'lesson',teacher_id:'owner','user_books.book_id':'book'}],
  ];
  for(const [table,row] of deps) {
    reset();state.tables[table]=[row];const before=JSON.parse(JSON.stringify(state.tables));
    const result=await invoke();assert.equal(result.body.outcome,'retained_as_teaching_only');
    assert(!state.calls.some(c=>c.op==='delete'));
    before.user_books[0].personal_tracking_status='not_tracking';assert.deepEqual(state.tables,before);
  }
  reset();const removed=await invoke();assert.equal(removed.body.outcome,'removed');assert.equal(state.tables.user_books.length,0);assert.equal(state.calls.filter(c=>c.op==='delete').length,11);
  for(const table of ['teacher_books','teacher_book_prep_items','teacher_book_vocabulary','teacher_notebook_entry_contexts','teacher_notebook_word_lists','teacher_student_lesson_books']) {
    reset();state.fail=table;const before=JSON.stringify(state.tables);assert.equal((await invoke()).status,500);assert.equal(JSON.stringify(state.tables),before);assert(!state.calls.some(c=>c.op==='delete'));
  }
  reset();state.tables.user_books[0].user_id='student';assert.equal((await invoke()).status,403);assert(!state.calls.some(c=>c.op==='delete'||c.op==='update'));
  reset();state.tables.user_books[0].book_id=null;assert.equal((await invoke()).status,500);assert(!state.calls.some(c=>c.op==='delete'));
  reset();state.tables.user_books[0].personal_tracking_status='not_tracking';state.tables.teacher_books=[deps[0][1]];assert.equal((await invoke()).body.outcome,'retained_as_teaching_only');assert(!state.calls.some(c=>c.op==='delete'));
  const React=require('react'), {renderToStaticMarkup}=require('react-dom/server');
  const Dialog=load('app/(protected)/books/[userBookId]/components/RemoveFromLibraryDialog.tsx').default;
  const html=renderToStaticMarkup(React.createElement(Dialog,{retainForTeaching:true,error:null,isRemoving:false,onCancel(){},onConfirm(){}}));
  assert(html.includes('Remove from My Library'));assert(html.includes('Teaching Only'));assert(!html.includes('Stop Personal Tracking'));
  // Exercise the actual Book Hub handler with a stale page and server outcomes.
  const pageSource=fs.readFileSync(path.join(root,'app/(protected)/books/[userBookId]/page.tsx'),'utf8');
  const handlerStart=pageSource.indexOf('  async function removeFromMyLibrary()');
  const handlerEnd=pageSource.indexOf('  async function pullQuickWord()',handlerStart);
  const handlerCode=ts.transpileModule(pageSource.slice(handlerStart,handlerEnd),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  for(const outcome of ['retained_as_teaching_only','removed']) {
    const ui={row:{id:'copy',user_id:'owner',notes:'keep'},status:'reading',retained:false,dialog:true,pushed:null};
    const noop=()=>{};
    const ctx={row:ui.row,userId:'owner',supabase:{auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}},
      fetch:async()=>({ok:true,json:async()=>({success:true,outcome})}),
      setIsRemovingFromLibrary:noop,setRemoveLibraryError:noop,setError:noop,setSaveNotice:noop,setSaveNoticeTone:noop,
      setPersonalTrackingStatus:v=>ui.status=v,setRow:fn=>ui.row=fn(ui.row),setRetainedForTeaching:v=>ui.retained=v,
      setShowRemoveLibraryConfirm:v=>ui.dialog=v,router:{push:v=>ui.pushed=v}};
    await vm.runInNewContext(handlerCode+'; removeFromMyLibrary();',ctx);
    if(outcome==='retained_as_teaching_only') {
      assert.equal(ui.row.id,'copy');assert.equal(ui.row.notes,'keep');assert.equal(ui.status,'not_tracking');assert.equal(ui.retained,true);assert.equal(ui.dialog,false);assert.equal(ui.pushed,null);
    } else assert.equal(ui.pushed,'/books');
  }
  const teachingOnlyExpression=pageSource.match(/const alreadyTeachingOnly = (.*);/)[1];
  assert.equal(vm.runInNewContext(teachingOnlyExpression,{retainForTeaching:true,personalTrackingStatus:'not_tracking'}),true);
  assert.equal(vm.runInNewContext(teachingOnlyExpression,{retainForTeaching:true,personalTrackingStatus:'reading'}),false);
  console.log('PASS: valid/legacy/mismatched links, independent teaching dependencies, all query failures, owner isolation, missing identity, existing teaching-only, unchanged ordinary removal, and retention confirmation. Retention preserves every fixture field and child.');
})().catch(e=>{console.error(e);process.exitCode=1;});
