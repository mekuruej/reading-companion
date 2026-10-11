import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', code)(name => mocks[name] ?? (name.startsWith('@/') ? load(name.replace('@/', '') + '.ts', mocks) : require(name)), mod, mod.exports);
  return mod.exports;
}
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [teacher, a, b, source, copyA, copyB, book, otherCopy, unrelated] = Array.from({length:9}, (_,i)=>id(i+1));
function database(role = 'teacher') {
  const tables = {
    profiles: [{id:teacher,role}, {id:a,display_name:'Real Student'}, {id:b,display_name:'Fake Student'}, {id:unrelated,display_name:'Unrelated'}],
    user_books: [{id:source,user_id:teacher,book_id:book}, {id:copyA,user_id:a,book_id:book}, {id:copyB,user_id:b,book_id:book}, {id:otherCopy,user_id:a,book_id:id(99)}, {id:id(20),user_id:unrelated,book_id:book}, {id:id(21),user_id:a,book_id:book}],
    teacher_students: [{teacher_id:teacher,student_id:a,archived_at:null}, {teacher_id:teacher,student_id:b,archived_at:null}],
    user_book_words: [], live_lesson_capture_sessions: [], live_lesson_capture_session_words: [],
  };
  const mutations = [];
  return { tables, mutations, auth: { getUser: async token => ({data:{user: token === 'valid' ? {id:teacher} : null},error:null}) }, from(table) {
    const filters=[]; let operation; let values;
    const q = { select(){return q;}, order(){return q;}, limit(){return q;}, in(k,v){filters.push(r=>v.includes(r[k]));return q;}, upsert(v){operation="insert";values=v;return q;}, eq(k,v){filters.push(r=>r[k]===v);return q;}, is(k,v){filters.push(r=>r[k]===v);return q;},
      insert(v){operation='insert';values=v;return q;}, update(v){operation='update';values=v;return q;}, delete(){operation='delete';return q;},
      maybeSingle: async()=>run(false), single:async()=>run(true), then(resolve,reject){return Promise.resolve(run(false,true)).then(resolve,reject);} };
    function run(required,many=false) {
      let rows=(tables[table]??[]).filter(r=>filters.every(f=>f(r)));
      if(operation){mutations.push({table,operation}); if(operation==='insert'){rows=(Array.isArray(values)?values:[values]).map((value,index)=>({id:id(50+tables[table].length+index),...value}));tables[table].push(...rows);} else if(operation==='update') rows.forEach(r=>Object.assign(r,values));else tables[table]=tables[table].filter(r=>!rows.includes(r));}
      return {data:many?rows:rows[0]??null,error:required&&!rows.length?new Error('Row not found'):null};
    }
    return q;
  }};
}
const {validateStudentToolContext:validate} = load('lib/teacher/studentToolContext.ts');
test('A → B → A always resolves the exact clicked copy, including duplicate copies',async()=>{
  const db=database();
  for(const [studentId,userBookId] of [[b,copyB],[a,copyA],[b,copyB],[a,id(21)]]) {
    const result=await validate(db,teacher,{studentId,userBookId,sourceUserBookId:source});
    assert.equal(result.studentId,studentId);assert.equal(result.studentUserBookId,userBookId);
  }
  assert.deepEqual(db.mutations,[]);
});
test('ordinary teacher rejects forged student, cross-student copy, different catalog book, and archived relationship',async()=>{
  const db=database();
  for(const context of [{studentId:unrelated,userBookId:id(20)},{studentId:a,userBookId:copyB},{studentId:a,userBookId:otherCopy},{studentId:teacher,userBookId:source},{studentId:'',userBookId:copyA}]) {
    await assert.rejects(validate(db,teacher,{...context,sourceUserBookId:source}));
  }
  db.tables.teacher_students[0].archived_at='2026-01-01';
  await assert.rejects(validate(db,teacher,{studentId:a,userBookId:copyA,sourceUserBookId:source}));
});
test('super_teacher can use an existing unlinked user without creating a relationship',async()=>{
  const db=database('super_teacher');
  const result=await validate(db,teacher,{studentId:unrelated,userBookId:id(20),sourceUserBookId:source});
  assert.equal(result.studentId,unrelated);assert.deepEqual(db.mutations,[]);
});
function wordRoute(db) {return load('app/api/teacher/student-words/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});}
function request(context,payload={},extra={}) {return new Request('http://local/api/teacher/student-words',{method:'POST',headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({context,payload,...extra})});}
test('actual vocabulary handler writes Fake → Real → Fake only to the requested user_book_words and prevents cross-copy edits',async()=>{
  const db=database();const route=wordRoute(db);
  for(const [studentId,userBookId] of [[b,copyB],[a,copyA],[b,copyB]]) {
    const result=await route.POST(request({studentId,userBookId,sourceUserBookId:source},{surface:'言葉',reading:'ことば',meaning:'word',user_book_id:userBookId}));
    assert.equal(result.status,200);assert.equal((await result.json()).data.user_book_id,userBookId);
  }
  const before=structuredClone(db.tables.user_book_words);
  const forged=await route.POST(request({studentId:a,userBookId:copyA,sourceUserBookId:source},{user_book_id:copyB}));
  assert.equal(forged.status,403);
  const wrongRow=await route.POST(request({studentId:a,userBookId:copyA,sourceUserBookId:source},{meaning:'wrong'},{id:before[0].id}));
  assert.notEqual(wrongRow.status,200);assert.deepEqual(db.tables.user_book_words,before);
  assert.ok(db.mutations.every(m=>m.table==='user_book_words'));
});
test('write endpoint requires authentication and matching source book',async()=>{
 const db=database();const route=wordRoute(db);
 assert.equal((await route.POST(new Request('http://local',{method:'POST'}))).status,401);
 assert.equal((await route.POST(request({studentId:a,userBookId:otherCopy,sourceUserBookId:source},{surface:'x'}))).status,403);
 assert.equal(db.tables.user_book_words.length,0);
});
const base='app/(protected)/books/[userBookId]/';
test('all four vocabulary card callbacks carry both identities for A and B; experience includes exact copy',()=>{
 const source=fs.readFileSync(base+'components/BookHubTeachingTools.tsx','utf8');
 for(const action of ['FollowAlong','SaveWords','Flashcards','VocabularyList']) assert.ok(source.includes(`onStudent${action}(student.userBookId as string, student.studentId)`));
 assert.ok(source.includes('onReadingExperiences(student.studentId, student.userBookId ?? undefined)'));
});
test('context changes remount working tools; contextual selectors and fallback are removed',()=>{
 const lesson=fs.readFileSync(base+'lesson/page.tsx','utf8');
 assert.ok(lesson.includes('key={`${params.userBookId}:${query.toString()}`}'));
 assert.ok(lesson.includes('const quickAddStudent = selectedStudent;'));
 assert.ok(lesson.includes('view === "curiosity" && !contextual && !personalCapture'));
 assert.ok(lesson.includes('{!contextual ? <label'));
 assert.ok(lesson.includes('Working with:'));
 for(const tool of ['study','words']) assert.ok(fs.readFileSync(base+tool+'/page.tsx','utf8').includes('<StudentToolBoundary>'));
 const experience=fs.readFileSync('app/(protected)/teacher/reading-experiences/[bookId]/page.tsx','utf8');
 assert.ok(experience.includes('key={`${params.bookId}:${query.toString()}`}'));
 assert.ok(experience.includes('{!contextual ? <button type="button" className="text-sm underline"'));
});

test('Follow-Along Quick Add handler saves B → A → B to exact student copies despite a previous session ID',async()=>{
 const db=database();
 const route=load('app/api/teacher/live-lesson-words/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
 let previousSession;
 for(const [studentId,userBookId] of [[b,copyB],[a,copyA],[b,copyB]]) {
  const response=await route.POST(new Request('http://local/api/teacher/live-lesson-words',{method:'POST',headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({studentId,userBookId,sourceUserBookId:source,sessionId:previousSession,surface:'言葉'})}));
  assert.equal(response.status,200);
  const data=await response.json();assert.equal(data.word.user_book_id,userBookId);assert.equal(data.session.student_id,studentId);assert.equal(data.session.user_book_id,userBookId);
  previousSession=data.session.id;
 }
 assert.deepEqual(db.tables.user_book_words.map(w=>w.user_book_id),[copyB,copyA,copyB]);
 assert.ok(db.mutations.every(m=>m.table!=='teacher_students'));
});

test('Flashcards and Vocabulary List boundary endpoint resolves A and B without writes or a fallback', async()=>{
 const db=database();const route=load('app/api/teacher/student-context/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
 for(const tool of ['study','words']) for(const [studentId,userBookId] of [[a,copyA],[b,copyB],[a,copyA]]) {
  const response=await route.GET(new Request('http://local/api/teacher/student-context?'+new URLSearchParams({studentId,userBookId,sourceUserBookId:source}),{headers:{authorization:'Bearer valid'}}));
  assert.equal(response.status,200,tool);const target=await response.json();assert.equal(target.studentId,studentId);assert.equal(target.studentUserBookId,userBookId);
 }
 assert.deepEqual(db.mutations,[]);
});

function bulkRoute(db) { return load('app/api/vocab/bulk/teaching/route.ts', {'@supabase/supabase-js':{createClient:()=>db}}); }
const batch = [{surface:'言葉',reading:'ことば',meaning:'word',meaningChoices:['word'],meaningChoiceIndex:0,page:'4',chapterNumber:'1',chapterName:'Opening',jlpt:'N5',kanjiMeta:[]}];
test('direct Bulk Add loads and saves A → B → exact duplicate A copy without creating relationships',async()=>{
 const db=database();const route=bulkRoute(db);
 for(const [studentId,targetUserBookId] of [[a,copyA],[b,copyB],[a,id(21)]]) {
  const context={studentId,targetUserBookId,sourceUserBookId:source};
  const response=await route.GET(new Request('http://local?'+new URLSearchParams(context),{headers:{authorization:'Bearer valid'}}));
  assert.equal(response.status,200);const data=await response.json();
  assert.equal(data.destinations.length,1);assert.equal(data.destinations[0].studentId,studentId);assert.equal(data.destinations[0].userBookId,targetUserBookId);
  const saved=await route.POST(new Request('http://local',{method:'POST',headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({...context,items:batch,positionUnit:'page'})}));
  assert.equal(saved.status,200);assert.equal((await saved.json()).savedCount,1);
  assert.equal(db.tables.user_book_words.at(-1).user_book_id,targetUserBookId);
  assert.equal(db.tables.user_book_words.at(-1).reading,'ことば');assert.equal(db.tables.user_book_words.at(-1).meaning,'word');
 }
 assert.deepEqual(db.tables.user_book_words.map(w=>w.user_book_id),[copyA,copyB,id(21)]);
 assert.ok(db.mutations.every(m=>m.table==='user_book_words'));
});
test('Bulk Add rejects unrelated, mismatched, missing and wrong-book contexts; universal super_teacher remains eligible',async(t)=>{
 t.mock.method(console,'error',()=>{});
 for(const role of ['teacher','super_teacher']) {
  const db=database(role);const route=bulkRoute(db);
  for(const [studentId,targetUserBookId,expected] of [[unrelated,id(20),role==='teacher'?403:200],[a,copyB,403],[a,otherCopy,403],['',copyA,400]]) {
   const context={studentId,targetUserBookId,sourceUserBookId:source};
   const headers={authorization:'Bearer valid','Content-Type':'application/json'};
   assert.equal((await route.GET(new Request('http://local?'+new URLSearchParams(context),{headers}))).status,expected);
   assert.equal((await route.POST(new Request('http://local',{method:'POST',headers,body:JSON.stringify({...context,items:batch})}))).status,expected);
  }
  assert.ok(db.mutations.every(m=>m.table==='user_book_words'));
 }
});
test('student cards expose compact direct Bulk Add callbacks for each exact copy',()=>{
 const rows=[{studentId:a,studentName:'A',userBookId:copyA,isAttached:true},{studentId:b,studentName:'B',userBookId:copyB,isAttached:true}];
 let cursor=0;const calls=[];
 const component=load(base+'components/BookHubTeachingTools.tsx', {react:{useEffect(){},useMemo:fn=>fn(),useState(initial){const index=cursor++;return [index===0?rows:index===2?false:initial,()=>{}]}},'@/lib/supabaseClient':{supabase:{}}}).default;
 const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
 const tree=component({userBookId:source,canUseBulkAdd:true,onStudentBulkAdd:(...args)=>calls.push(args)});
 const buttons=nodes(tree).filter(n=>n.props?.children==='Bulk Add');assert.equal(buttons.length,2);buttons.forEach(b=>b.props.onClick());
 assert.deepEqual(calls,[[copyA,a],[copyB,b]]);
});
test('Bulk Add locks the visible target despite stale destination state and remounts on student navigation',()=>{
 const filename='app/(protected)/vocab/bulk/page.tsx';
 const componentMocks=Object.fromEntries([...fs.readFileSync(filename,'utf8').matchAll(/import (\w+) from "(\.\/components\/[^\"]+)"/g)].map(([,name,path])=>[path,{default:name,__esModule:true}]));
 let routeQuery;let cursor;
 const destinations=[{type:'student',studentId:a,userBookId:copyA,label:'Student A'},{type:'student',studentId:b,userBookId:copyB,label:'Student B'}];
 const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
 const labels=t=>typeof t==='string'?t:Array.isArray(t)?t.map(labels).join(''):t&&typeof t==='object'?labels(t.props?.children):'';
 const component=load(filename,{...componentMocks,react:{useEffect(){},useMemo:fn=>fn(),useState(initial){const index=cursor++;return [({0:'Book Title',3:{studentName:routeQuery.get('studentId')===a?'Student A':'Student B',backHref:'/books/source'},4:destinations,5:`student:${copyB}`,7:routeQuery.get('userBookId')})[index]??initial,()=>{}];}},'next/navigation':{useRouter:()=>({}),useSearchParams:()=>routeQuery},'@/lib/supabaseClient':{supabase:{}}}).default;
 let lastKey;
 for(const [studentId,userBookId,name] of [[a,copyA,'Student A'],[b,copyB,'Student B'],[a,copyA,'Student A']]) {
  routeQuery=new URLSearchParams({studentId,userBookId,sourceUserBookId:source,context:'student-card'});cursor=0;
  const outer=component();assert.notEqual(outer.key,lastKey);lastKey=outer.key;
  const tree=outer.type(outer.props);assert.ok(labels(tree).includes(`Adding words to ${name}`));assert.ok(!nodes(tree).some(n=>n.type==='select'));
 }
});
