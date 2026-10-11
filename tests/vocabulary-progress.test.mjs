import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
function load(file,mocks={}) {
 const mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',code)(name=>{
  if(mocks[name])return mocks[name];
  if(name.startsWith('@/')||name.startsWith('.')) {const base=name.startsWith('@/')?name.slice(2):path.join(path.dirname(file),name);return load([base+'.ts',base+'.tsx'].find(fs.existsSync),mocks);}
  return require(name);
 },mod,mod.exports);return mod.exports;
}
const {suggestCapturePosition:suggest}=load('lib/books/vocabularyProgress.ts');
test('suggest only matching current-session positions, never convert units or fill missing locations',()=>{
 assert.equal(suggest([34,35,37].map(value=>({unit:'page',value})),'page'),'37');
 assert.equal(suggest([{unit:'page',value:37}],'kindle_location'),'');
 assert.equal(suggest([{unit:'kindle_location',value:1358}],'kindle_location'),'1358');
 assert.equal(suggest([{unit:'percent',value:42}],'percent'),'42');
 assert.equal(suggest([{unit:'page',value:null},{unit:'page',value:''}],'page'),'');
 assert.equal(suggest([],'page'),'');assert.equal(suggest([{unit:'page',value:37}],null),'');
});
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const actor=id(1),student=id(2),other=id(3),own=id(10),studentCopy=id(11),otherCopy=id(12),book=id(20);
function fixture(role='teacher') {
 const tables={profiles:[{id:actor,role},{id:student,display_name:'Bobby'},{id:other,display_name:'Other'}],user_books:[{id:own,user_id:actor,book_id:book,progress_tracking_method:'page',finished_at:'2026-10-01',books:{page_count:300}},{id:studentCopy,user_id:student,book_id:book,progress_tracking_method:'page',books:{page_count:300}},{id:otherCopy,user_id:other,book_id:book,progress_tracking_method:'page',books:{page_count:300}}],teacher_students:[{teacher_id:actor,student_id:student,archived_at:null}],user_book_reading_sessions:[],user_book_words:[{id:id(99),user_book_id:studentCopy,page_number:280}]};
 const mutations=[];
 const db={auth:{getUser:async token=>({data:{user:token==='valid'?{id:actor}:null},error:null})},from(table){let filters=[],insert;const q={select(){return q;},eq(k,v){filters.push(row=>row[k]===v);return q;},is(k,v){filters.push(row=>row[k]===v);return q;},order(){return q;},range(){return q;},insert(value){insert=value;return q;},maybeSingle(){return Promise.resolve(run(true));},single(){return Promise.resolve(run(true));},then(resolve,reject){return Promise.resolve(run()).then(resolve,reject);}};function run(single=false){let rows=tables[table].filter(row=>filters.every(fn=>fn(row)));if(insert){mutations.push({table,insert});rows=[{id:id(100+tables[table].length),...insert}];tables[table].push(...rows);}return {data:single?rows[0]??null:rows,error:null};}return q;}};
 const route=load('app/api/books/[userBookId]/vocabulary-progress/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
 const request=(copy,body,query={})=>route[body?'POST':'GET'](new Request('http://local?'+new URLSearchParams(query),{method:body?'POST':'GET',headers:{authorization:'Bearer valid','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{params:Promise.resolve({userBookId:copy})});
 return {tables,mutations,request};
}
test('self prompt loading does not write; explicit confirmation appends canonical history without changing finished status or vocabulary',async()=>{
 const f=fixture();const before=structuredClone(f.tables);
 assert.equal((await f.request(own)).status,200);assert.equal(f.mutations.length,0);
 assert.equal((await f.request(own,{value:'37',method:'page'})).status,400);assert.equal(f.mutations.length,0);
 assert.equal((await f.request(own,{confirmed:true,value:'37',method:'page'})).status,200);
 const record=f.tables.user_book_reading_sessions[0];assert.equal(record.user_book_id,own);assert.equal(record.end_position,37);assert.equal(record.end_page,37);assert.equal(record.start_position,null);assert.equal(record.minutes_read,null);
 assert.deepEqual(f.tables.user_books,before.user_books);assert.deepEqual(f.tables.user_book_words,before.user_book_words);
});
test('student prompt resolves name and updates exact student copy, never teacher; rejects forged and stale targets',async()=>{
 const f=fixture();const context={studentId:student,sourceUserBookId:own};
 const loaded=await f.request(studentCopy,undefined,context);assert.equal((await loaded.json()).studentName,'Bobby');assert.equal(f.mutations.length,0);
 assert.equal((await f.request(studentCopy,{...context,confirmed:true,value:37,method:'page'})).status,200);
 assert.equal(f.tables.user_book_reading_sessions[0].user_book_id,studentCopy);
 assert.equal((await f.request(otherCopy,{...context,confirmed:true,value:38,method:'page'})).status,403);
 assert.equal((await f.request(otherCopy,{studentId:other,sourceUserBookId:own,confirmed:true,value:38,method:'page'})).status,403);
 assert.equal(f.mutations.length,1);
 const elevated=fixture('super_teacher');assert.equal((await elevated.request(otherCopy,{studentId:other,sourceUserBookId:own,confirmed:true,value:38,method:'page'})).status,200);
});
test('tracking units, totals and backwards progress use canonical validation',async()=>{
 for(const [method,value] of [['kindle_location',1358],['percent',42]]) {
  const f=fixture();f.tables.user_books[0].progress_tracking_method=method;
  assert.equal((await f.request(own,{confirmed:true,method,value})).status,200);
  assert.equal(f.tables.user_book_reading_sessions[0].tracking_unit,method);assert.equal(f.tables.user_book_reading_sessions[0].end_page,null);
  assert.equal((await f.request(own,{confirmed:true,method,value:value-1})).status,409);assert.equal(f.mutations.length,1);
  assert.equal((await f.request(own,{confirmed:true,method:'page',value:50})).status,409);
 }
 const f=fixture();assert.equal((await f.request(own,{confirmed:true,method:'page',value:301})).status,400);
 f.tables.user_books[0].progress_tracking_method=null;assert.equal((await f.request(own,{confirmed:true,method:'page',value:10})).status,409);assert.equal(f.mutations.length,0);
});
const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
const text=t=>typeof t==='string'?t:Array.isArray(t)?t.map(text).join(''):t&&typeof t==='object'?text(t.props?.children):'';
for(const method of ['page','kindle_location','percent'])test(`${method} UI asks once and Not now performs no write`,async(t)=>{
 let state=[],cursor=0,effect;const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push(options.method);return Response.json({studentName:'Bobby',method,total:method==='percent'?100:2000,current:null});});
 const component=load('components/books/VocabularyProgressPrompt.tsx',{react:{useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],next=>{state[i]=typeof next==='function'?next(state[i]):next;}];},useEffect(fn){effect??=fn;}},'@/lib/supabaseClient':{supabase:{auth:{getSession:async()=>({data:{session:{access_token:'valid'}}})}}}}).default;
 const props={userBookId:studentCopy,studentId:student,sourceUserBookId:own,autoOpen:true,positions:[{unit:'page',value:37}]};
 const render=()=>{cursor=0;const outer=component(props);return outer.type(outer.props);};
 render();effect();await new Promise(resolve=>setImmediate(resolve));
 const tree=render();assert.ok(text(tree).includes('Where did Bobby stop?'));
 assert.ok(text(tree).includes(method==='page'?'Page':method==='kindle_location'?'Location':'Percent'));
 assert.equal(nodes(tree).find(n=>n.type==='input').props.value,method==='page'?'37':'');
 nodes(tree).find(n=>n.type==='button'&&n.props.children==='Not now').props.onClick();assert.equal(render(),null);assert.deepEqual(calls,['GET']);
});
test('new prompts are wired at completion; Live Lesson has no competing prompt',()=>{
 const base='app/(protected)/books/[userBookId]/';
 assert.ok(fs.readFileSync('app/(protected)/vocab/bulk/page.tsx','utf8').includes('step === "done" && <><BulkDonePanel />'));
 assert.ok(fs.readFileSync(base+'add-word/page.tsx','utf8').includes('actionLabel="Update progress"'));
 for(const file of ['curiosity-reading/WordTimerExperience.tsx','readalong/page.tsx']) {
  const source=fs.readFileSync(base+file,'utf8');assert.ok(source.includes('!showTimedSessionForm && !hasFinishedTimer && elapsed === 0'));
 }
 const live=fs.readFileSync('app/(protected)/teacher/students/[studentId]/books/[userBookId]/lesson-add/LiveLessonQuickAddPanel.tsx','utf8');assert.ok(!live.includes('VocabularyProgressPrompt'));
});

test('Bulk Add completion supplies one prompt with the exact saved target and current batch only',()=>{
 const file='app/(protected)/vocab/bulk/page.tsx';
 const mocks=Object.fromEntries([...fs.readFileSync(file,'utf8').matchAll(/import (\w+) from "(\.\/components\/[^\"]+)"/g)].map(([,name,path])=>[path,{default:name,__esModule:true}]));
 for(const contextual of [false,true]) {
  const copy=contextual?studentCopy:own;let cursor=0;
  const query=new URLSearchParams({userBookId:copy,...(contextual?{studentId:student,sourceUserBookId:own,context:'student-card'}:{})});
  const batch=[34,35,37].map(page=>({page:String(page)}));
  const values={0:'Book',2:'page',3:contextual?{studentId:student,studentName:'Bobby'}:null,4:contextual?[{type:'student',studentId:student,userBookId:studentCopy,label:'Bobby'}]:[],5:'teacher',7:copy,8:'done',19:batch};
  const Component=load(file,{...mocks,react:{useEffect(){},useMemo:fn=>fn(),useState(initial){const i=cursor++;return [Object.hasOwn(values,i)?values[i]:initial,()=>{}];}},'next/navigation':{useSearchParams:()=>query,useRouter:()=>({})},'@/lib/supabaseClient':{supabase:{}}}).default;
  const outer=Component();const prompts=nodes(outer.type(outer.props)).filter(n=>n.type?.name==='VocabularyProgressPrompt');
  assert.equal(prompts.length,1);assert.equal(prompts[0].props.userBookId,copy);assert.equal(prompts[0].props.autoOpen,true);
  assert.equal(prompts[0].props.studentId,contextual?student:undefined);assert.equal(suggest(prompts[0].props.positions,'page'),'37');
 }
});
test('audiobook keeps explicit rewind semantics and equal positions create no duplicate history',async()=>{
 const f=fixture();f.tables.user_books[0].books={edition_format:'audiobook',audiobook_duration_minutes:180};
 for(const value of [70,60,60]) assert.equal((await f.request(own,{confirmed:true,method:'audiobook_time',value})).status,200);
 assert.equal(f.tables.user_book_reading_sessions.length,2);
 assert.equal(f.tables.user_book_reading_sessions[0].session_mode,'listening');
 assert.ok(f.tables.user_book_reading_sessions.every(row=>row.end_page===null&&row.minutes_read===null));
});
