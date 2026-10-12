import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(file, mocks = {}, cache = new Map()) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (mocks[name]) return mocks[name];
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? name.slice(2) : path.join(path.dirname(file), name);
      return load([base + '.ts', base + '.tsx'].find(fs.existsSync), mocks, cache);
    }
    return require(name);
  }, mod, mod.exports);
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
  tables.user_books.forEach(row => row.progress_tracking_method = 'page');
  return { tables, mutations, rpc(name, args) {
    assert.equal(name, 'capture_live_lesson_word');
    return { single: async () => {
      const word = { id: id(50 + tables.user_book_words.length), ...args.p_word };
      tables.user_book_words.push(word);
      tables.live_lesson_capture_session_words.push({ session_id: args.p_session_id, user_book_word_id: word.id, position: args.p_position });
      mutations.push({table:'user_book_words',operation:'insert'}, {table:'live_lesson_capture_session_words',operation:'insert'});
      return {data:word,error:null};
    }};
  }, auth: { getUser: async token => ({data:{user: token === 'valid' ? {id:teacher} : null},error:null}) }, from(table) {
    const filters=[]; let operation; let values;
    const q = { or(){return q;}, not(k,op,v){filters.push(r=>r[k] != v);return q;}, neq(k,v){filters.push(r=>r[k]!==v);return q;}, select(){return q;}, range(){return q;}, order(){return q;}, limit(){return q;}, in(k,v){filters.push(r=>v.includes(r[k]));return q;}, upsert(v){operation="insert";values=v;return q;}, eq(k,v){filters.push(r=>r[k]===v);return q;}, is(k,v){filters.push(r=>r[k]===v);return q;},
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

test('live capture → checkpoint → defer → fresh reload → enrich → finish preserves exact rows and student', async()=>{
 const db=database();
 const makeRoute=()=>load('app/api/teacher/live-lesson-words/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
 let route=makeRoute();
 const context={studentId:a,userBookId:copyA,sourceUserBookId:source};
 const call=async(method,body)=>{
  const response=await route[method](new Request('http://local/api/teacher/live-lesson-words',{method,headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({...context,...body})}));
  const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;
 };
 const first=await call('POST',{surface:'もってきた',page:12,positionUnit:'page',chapterNumber:2,alternativeSurface:'must not replace captured text'});
 const sessionId=first.session.id;
 assert.equal(first.word.page_number,12);assert.equal(first.word.surface,'もってきた');assert.equal(first.word.reading,null);assert.equal(first.word.meaning,null);assert.equal(first.word.excluded_from_flashcards,true);
 const second=await call('POST',{sessionId,surface:'言葉',page:12,positionUnit:'page',chapterNumber:2});
 assert.equal(second.session.id,sessionId);
 const ids=db.tables.user_book_words.map(w=>w.id);
 const links=structuredClone(db.tables.live_lesson_capture_session_words);
 const end=await call('PATCH',{sessionId,action:'end-adding',saveStoppingPoint:true,stoppingPageNumber:'13',stoppingText:'Last paragraph',words:[]});
 assert.equal(end.session.status,'reviewing');assert.equal(end.session.stopping_page_number,13);
 const edited={id:ids[0],surface:'持ってくる',encountered_surface:'もってきた',base_form:'持ってくる',lookup_surface:'持ってくる',reading:'もってくる',meaning:'bring',meaningChoices:['bring','take'],meaningChoiceIndex:0,book_form:'持ってきた',book_form_description:'Past',follow_along_support_note:'surrounding phrase',pageNumber:'14',positionUnit:'page',chapterNumber:'2',chapterName:'Arrival',targetLanguageCode:'ja'};
 db.tables.user_book_words[0].vocabulary_cache_id=123;
 const deferred=await call('PATCH',{sessionId,action:'review-later',words:[edited]});
 assert.equal(deferred.session.status,'deferred');assert.equal(db.tables.user_book_words[0].excluded_from_flashcards,true);
 route=makeRoute(); // New handler instance; no client/local state.
 const response=await route.GET(new Request('http://local?'+new URLSearchParams(context),{headers:{authorization:'Bearer valid'}}));
 assert.equal(response.status,200);const restored=await response.json();
 assert.equal(restored.session.id,sessionId);assert.equal(restored.words.length,2);
 const word=restored.words.find(w=>w.id===ids[0]);
 for(const field of ['surface','encountered_surface','base_form','lookup_surface','reading','meaning','book_form','book_form_description','follow_along_support_note','chapter_name']) assert.equal(word[field],field==='chapter_name'?edited.chapterName:edited[field]);
 assert.equal(word.page_number,14);assert.equal(word.vocabulary_cache_id,null);
 assert.equal(restored.latestStoppingPoint.pageNumber,13);
 const finished=await call('PATCH',{sessionId,action:'finish-review',words:[edited]});
 assert.equal(finished.session.status,'completed');assert.equal(db.tables.user_book_words[0].excluded_from_flashcards,false);assert.equal(db.tables.user_book_words[1].excluded_from_flashcards,true);
 assert.deepEqual(db.tables.user_book_words.map(w=>w.id),ids);assert.deepEqual(db.tables.live_lesson_capture_session_words,links);
 assert.equal(db.tables.live_lesson_capture_sessions.length,1);
 assert.ok(db.tables.user_book_words.every(w=>w.user_book_id===copyA));assert.ok(db.mutations.every(m=>m.table!=='teacher_students'));
});

test('review endpoint rejects another student session and permits checkpoint skip with incomplete words',async()=>{
 const db=database();const route=load('app/api/teacher/live-lesson-words/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
 const call=(method,body)=>route[method](new Request('http://local',{method,headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({studentId:a,userBookId:copyA,sourceUserBookId:source,...body})}));
 const capture=await (await call('POST',{surface:'猫',page:1})).json();
 assert.equal((await call('PATCH',{sessionId:capture.session.id,action:'end-adding',saveStoppingPoint:false,words:[]})).status,200);
 const before=structuredClone(db.tables);
 assert.equal((await call('PATCH',{studentId:b,userBookId:copyB,sessionId:capture.session.id,action:'review-later',words:[{id:capture.word.id,surface:'wrong'}]})).status,404);
 assert.deepEqual(db.tables,before);
});

test('live capture has no enrichment controls; review keeps word context and saved definition choices',()=>{
 const panel=fs.readFileSync('app/(protected)/teacher/students/[studentId]/books/[userBookId]/lesson-add/LiveLessonQuickAddPanel.tsx','utf8');
 const capture=panel.slice(panel.indexOf('<form onSubmit={captureWord}'),panel.indexOf('</form>',panel.indexOf('<form onSubmit={captureWord}')));
 for(const detail of ['WordContextFields','alternativeSurface','draft.reading','draft.meaning']) assert.ok(!capture.includes(detail));
 for(const detail of ['currentPage','chapterNumber','chapterName']) assert.ok(capture.includes(detail));
 assert.ok(panel.includes('<WordContextFields teacher value={wordContextPayload(draft)}'));assert.ok(panel.includes('draft.meaningChoices.map'));
 assert.ok(panel.includes('lookupVersions.current[draft.id] !== lookupVersion'));
 assert.ok(panel.includes('Your captured words are saved. You can finish reviewing them later.'));
 const workspace=fs.readFileSync('app/api/teacher/student-workspace/route.ts','utf8');
 assert.ok(workspace.includes('.in("status", REVIEW_ATTENTION_STATUSES)'));
});

test('minimal live capture retains Kindle and percentage positions and chapter context', async()=>{
 for(const [unit,value] of [['kindle_location',420],['percent',12.5]]) {
  const db=database();db.tables.user_books.find(row=>row.id===copyA).progress_tracking_method=unit;
  const route=load('app/api/teacher/live-lesson-words/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
  const response=await route.POST(new Request('http://local',{method:'POST',headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({studentId:a,userBookId:copyA,sourceUserBookId:source,surface:'もってきた',positionUnit:unit,page:String(value),chapterNumber:3,chapterName:'Opening'})}));
  assert.equal(response.status,200);const {word}=await response.json();
  assert.equal(word.position_unit,unit);assert.equal(word.position_value,value);assert.equal(word.chapter_number,3);assert.equal(word.chapter_name,'Opening');assert.equal(word.reading,null);assert.equal(word.meaning,null);
 }
});


function crossEditionDatabase(role = 'teacher') {
 const db = database(role);
 db.tables.books = [{id:book,work_id:id(100),title:'Shared title',edition_format:'paperback',page_count:214},{id:id(99),work_id:id(100),title:'Shared title',edition_format:'kindle'}];
 db.tables.teacher_books=[];db.tables.teacher_student_lesson_books=[];
 db.tables.user_books.find(row=>row.id===otherCopy).progress_tracking_method='kindle_location';
 return db;
}
const {discoverTeachingSources,validateTeachingSourceContext:validateSource}=load('lib/teacher/teachingSource.ts');
test('cross-edition discovery returns zero, one, or all explicit owned sources without writes or fuzzy matching',async()=>{
 const db=crossEditionDatabase();
 const discover=()=>discoverTeachingSources(db,teacher,a,otherCopy);
 assert.deepEqual((await discover()).sources.map(s=>s.sourceUserBookId),[source]);
 db.tables.user_books.push({id:id(101),user_id:teacher,book_id:id(99)});
 assert.deepEqual((await discover()).sources.map(s=>s.sourceUserBookId),[source,id(101)]);
 db.tables.user_books=db.tables.user_books.filter(r=>r.user_id!==teacher);
 assert.deepEqual((await discover()).sources,[]);
 db.tables.user_books.push({id:source,user_id:teacher,book_id:book});
 db.tables.books[0].work_id=null;
 assert.deepEqual((await discover()).sources,[]);
 assert.equal((await discoverTeachingSources(db,teacher,a,copyA)).sources[0].sourceUserBookId,source);
 assert.deepEqual(db.mutations,[]);
});
test('cross-edition validator preserves exact target, rejects forged pairings, and leaves other tools exact-edition only',async()=>{
 const db=crossEditionDatabase();const context={studentId:a,userBookId:otherCopy,sourceUserBookId:source};
 assert.equal((await validateSource(db,teacher,context)).studentUserBookId,otherCopy);
 await assert.rejects(validate(db,teacher,context));
 for(const invalid of [{studentId:b},{sourceUserBookId:copyA},{userBookId:copyB},{studentId:unrelated,userBookId:id(20)}]) await assert.rejects(validateSource(db,teacher,{...context,...invalid}));
 db.tables.books[0].work_id=id(102);await assert.rejects(validateSource(db,teacher,context));
 db.tables.books[0].work_id=null;await assert.rejects(validateSource(db,teacher,context));
 assert.deepEqual(db.mutations,[]);
});
test('source discovery API denies ordinary unrelated access and plain admin, permits super_teacher without relationship creation',async()=>{
 for(const role of ['teacher','admin','super_teacher']) {
  const db=crossEditionDatabase(role);const route=load('app/api/teacher/teaching-sources/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
  const result=await route.GET(new Request('http://local?'+new URLSearchParams({studentId:unrelated,targetUserBookId:id(20)}),{headers:{authorization:'Bearer valid'}}));
  assert.equal(result.status,role==='super_teacher'?200:403);assert.deepEqual(db.mutations,[]);
 }
});
test('lesson GET keeps teacher source and student Kindle target separate and creates no relationships',async()=>{
 const db=crossEditionDatabase();const route=load('app/api/books/[userBookId]/teaching-lesson/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
 const result=await route.GET(new Request('http://local?'+new URLSearchParams({studentId:a,studentUserBookId:otherCopy}),{headers:{authorization:'Bearer valid'}}),{params:Promise.resolve({userBookId:source})});
 const body=await result.json();assert.equal(result.status,200,JSON.stringify(body));
 assert.equal(body.sourceEdition.id,book);assert.equal(body.targetEdition.id,id(99));assert.equal(body.teacherBookId,null);
 assert.equal(body.students[0].studentUserBookId,otherCopy);assert.equal(body.students[0].studentId,a);
 assert.ok(!('chapterSuggestions' in body));assert.deepEqual(db.mutations,[]);
});
test('cross-edition live capture, defer, source-free resume and final review write only the student Kindle copy',async()=>{
 const db=crossEditionDatabase();
 const teacherWord={id:id(150),user_book_id:source,surface:'teacher',page_number:42,chapter_number:7,book_form:'teacher form'};
 db.tables.user_book_words.push(teacherWord);const before=structuredClone(teacherWord);
 const route=load('app/api/teacher/live-lesson-words/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
 const context={studentId:a,userBookId:otherCopy,sourceUserBookId:source};
 const call=async(method,body)=>{
  const response=await route[method](new Request('http://local',{method,headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({...context,...body})}));
  const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;
 };
 const captured=await call('POST',{surface:'もってきた',page:1867,positionUnit:'kindle_location'});
 assert.equal(captured.word.user_book_id,otherCopy);assert.equal(captured.word.position_value,1867);assert.equal(captured.word.position_unit,'kindle_location');
 assert.equal(captured.word.chapter_number,null);assert.equal(captured.word.book_form ?? null,null);assert.equal(captured.word.excluded_from_flashcards,true);
 const sessionId=captured.session.id;
 await call('PATCH',{sessionId,action:'end-adding',saveStoppingPoint:false,words:[]});
 await call('PATCH',{sessionId,action:'review-later',words:[]});
 const resumed=await route.GET(new Request('http://local?'+new URLSearchParams({studentId:a,userBookId:otherCopy,sessionId}),{headers:{authorization:'Bearer valid'}}));
 const resumedBody=await resumed.json();assert.equal(resumed.status,200);assert.equal(resumedBody.session.id,sessionId);assert.equal(resumedBody.session.user_book_id,otherCopy);
 const finished=await call('PATCH',{sessionId,action:'finish-review',words:[{id:captured.word.id,surface:'持ってくる',reading:'もってくる',meaning:'bring',book_form:'持ってきた',alternative_surface:'もってくる',pageNumber:'1867',positionUnit:'kindle_location',targetLanguageCode:'ja'}]});
 assert.equal(finished.session.status,'completed');
 const saved=db.tables.user_book_words.find(w=>w.id===captured.word.id);
 assert.equal(saved.user_book_id,otherCopy);assert.equal(saved.surface,'持ってくる');assert.equal(saved.book_form,'持ってきた');assert.equal(saved.alternative_surface,'もってくる');assert.equal(saved.excluded_from_flashcards,false);
 assert.deepEqual(teacherWord,before);assert.equal(db.tables.user_book_words.length,2);
 assert.ok(db.mutations.every(m=>['user_book_words','live_lesson_capture_sessions','live_lesson_capture_session_words'].includes(m.table)));
});


test('source reference loader reads only the selected teacher copy without creating a Teacher Book',async()=>{
 const db=crossEditionDatabase();
 db.tables.finalized_user_book_words=[{id:id(151),user_book_id:source,surface:'teacher',page_number:42,chapter_number:7,book_form:'source form'}, {id:id(152),user_book_id:otherCopy,surface:'student',position_unit:'kindle_location',position_value:1867}];
 const {loadOwnedTeachingSource}=load('lib/teacher/teacherBookVocabulary.ts');
 const reference=await loadOwnedTeachingSource(db,teacher,source);
 assert.equal(reference.source.id,source);assert.equal(reference.context.personalUserBookId,source);assert.equal(reference.context.teacherBookId,'');
 assert.deepEqual(reference.vocabulary.map(w=>w.surface),['teacher']);assert.equal(reference.vocabulary[0].pageNumber,42);assert.equal(reference.vocabulary[0].book_form,'source form');
 await assert.rejects(loadOwnedTeachingSource(db,teacher,otherCopy));assert.deepEqual(db.mutations,[]);
});
test('explicit Add Lesson Book creates only the student copy when teacher does not own that edition',async()=>{
 const db=crossEditionDatabase();db.tables.user_books=db.tables.user_books.filter(r=>r.id!==otherCopy);
 const route=load('app/api/teacher/student-workspace/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
 const result=await route.POST(new Request('http://local',{method:'POST',headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({studentId:a,bookId:id(99)})}));
 const body=await result.json();assert.equal(result.status,200,JSON.stringify(body));assert.equal(body.createdUserBook,true);
 const copy=db.tables.user_books.find(r=>r.id===body.userBookId);assert.equal(copy.user_id,a);assert.equal(copy.book_id,id(99));
 assert.equal(db.tables.teacher_student_lesson_books[0].user_book_id,copy.id);
 assert.deepEqual(db.tables.user_books.filter(r=>r.user_id===teacher).map(r=>r.id),[source]);
 assert.ok(db.mutations.every(m=>['user_books','teacher_student_lesson_books'].includes(m.table)));
});
test('source chooser automatically opens one source, requires choice for multiple, and shows explicit action for none',async(t)=>{
 const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
 const labels=t=>typeof t==='string'?t:Array.isArray(t)?t.map(labels).join(''):t&&typeof t==='object'?labels(t.props?.children):'';
 for(const count of [0,1,2]) {
  let cursor=0;const states=[];let effect;const navigations=[];
  const data={target:{studentName:'Locked Student'},targetEdition:{title:'Kindle'},sources:Array.from({length:count},(_,i)=>({sourceUserBookId:id(200+i),edition:{title:'Teacher copy'}}))};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>data}));
  const router={replace:href=>navigations.push(href)};
  const Page=load('app/(protected)/teacher/students/[studentId]/books/[userBookId]/follow/page.tsx',{
   react:{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=value];},useEffect(fn){effect=fn;}},
   'next/navigation':{useParams:()=>({studentId:a,userBookId:otherCopy}),useRouter:()=>router,useSearchParams:()=>new URLSearchParams('sessionId='+id(250))},
   '@/components/books/BookEditionLine':{default:()=>null,__esModule:true},
   '@/lib/supabaseClient':{supabase:{auth:{getSession:async()=>({data:{session:{access_token:'valid'}}})}}}
  }).default;
  const outer=Page();outer.type(outer.props);const cleanup=effect();await new Promise(resolve=>setImmediate(resolve));cursor=0;
  const tree=outer.type(outer.props);assert.ok(labels(tree).includes('Locked Student'));assert.ok(!nodes(tree).some(n=>n.type==='select'));
  if(count===1) {assert.equal(navigations.length,1);const url=new URL(navigations[0],'http://local');assert.equal(url.pathname,`/books/${id(200)}/lesson`);assert.equal(url.searchParams.get('studentUserBookId'),otherCopy);assert.equal(url.searchParams.get('studentId'),a);}
  else assert.deepEqual(navigations,[]);
  if(count===2){assert.ok(labels(tree).includes('Which edition are you teaching from?'));const links=nodes(tree).filter(n=>n.props?.href?.startsWith('/books/')&&n.props.href.includes('/lesson?'));assert.equal(links.length,2);for(const link of links)assert.equal(new URL(link.props.href,'http://local').searchParams.get('studentUserBookId'),otherCopy);}
  if(count===0){assert.ok(labels(tree).includes('You don’t have a teaching source for this work yet.'));assert.ok(nodes(tree).some(n=>n.props?.href==='/books/add'));}
  cleanup();t.mock.restoreAll();
 }
});
test('location state is target-keyed and teacher chapter suggestions cannot prefill captures',()=>{
 const panel=fs.readFileSync('app/(protected)/teacher/students/[studentId]/books/[userBookId]/lesson-add/LiveLessonQuickAddPanel.tsx','utf8');
 assert.ok(!panel.includes('chapterSuggestions'));assert.ok(panel.includes('Student copy ·'));
 assert.ok(panel.includes('parsed.targetLocationVersion === 2'));assert.ok(panel.includes('targetLocationVersion: 2'));
 const lesson=fs.readFileSync(base+'lesson/page.tsx','utf8');assert.ok(!lesson.includes('chapterSuggestions'));assert.ok(lesson.includes('Teaching from:'));assert.ok(lesson.includes('Student reading:'));
});


test('selecting a second owned copy does not pull teaching support linked to the first or repair its relationship',async()=>{
 const db=crossEditionDatabase();const secondSource=id(301);
 db.tables.user_books.push({id:secondSource,user_id:teacher,book_id:book});
 db.tables.teacher_books=[{id:id(302),teacher_id:teacher,book_id:book,user_book_id:source}];
 db.tables.finalized_user_book_words=[{id:id(303),user_book_id:secondSource,surface:'chosen copy'}];
 db.tables.finalized_teacher_book_vocabulary=[{id:id(304),teacher_book_id:id(302),surface:'other copy'}];
 const {loadOwnedTeachingSource}=load('lib/teacher/teacherBookVocabulary.ts');
 const reference=await loadOwnedTeachingSource(db,teacher,secondSource);
 assert.equal(reference.context.teacherBookId,'');assert.deepEqual(reference.vocabulary.map(w=>w.surface),['chosen copy']);assert.deepEqual(db.mutations,[]);
});
test('tampered cross-edition API source/target parameters fail before any capture or relationship mutation',async(t)=>{
 t.mock.method(console,'error',()=>{});
 for(const patch of [{sourceUserBookId:copyA},{studentId:b},{userBookId:copyB}]) {
  const db=crossEditionDatabase();const route=load('app/api/teacher/live-lesson-words/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
  const response=await route.POST(new Request('http://local',{method:'POST',headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({studentId:a,userBookId:otherCopy,sourceUserBookId:source,surface:'test',...patch})}));
  assert.equal(response.status,403);assert.deepEqual(db.mutations,[]);
 }
 for(const workId of [null,id(999)]) {
  const db=crossEditionDatabase();db.tables.books[0].work_id=workId;
  const route=load('app/api/teacher/live-lesson-words/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
  const response=await route.POST(new Request('http://local',{method:'POST',headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({studentId:a,userBookId:otherCopy,sourceUserBookId:source,surface:'test'})}));
  assert.equal(response.status,403);assert.deepEqual(db.mutations,[]);
 }
});


test('typed checkpoints save/restore exact target units, preserve Review Later, and Skip does not overwrite',async()=>{
 for(const [unit,value] of [['page',42],['kindle_location',1867],['percent',38.5]]) {
  const db=crossEditionDatabase();const target=db.tables.user_books.find(r=>r.id===otherCopy);target.progress_tracking_method=unit;target.books={page_count:214,kindle_location_count:2500};
  const route=load('app/api/teacher/live-lesson-words/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
  const context={studentId:a,userBookId:otherCopy,sourceUserBookId:source};
  const call=async(method,body)=>{const r=await route[method](new Request('http://local',{method,headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({...context,...body})}));const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;};
  const capture=await call('POST',{surface:'word'});const sessionId=capture.session.id;
  assert.equal(capture.session.stopping_value,undefined);
  const saved=await call('PATCH',{sessionId,action:'end-adding',saveStoppingPoint:true,stoppingValue:String(value),stoppingUnit:unit,stoppingText:'after the café'});
  assert.equal(saved.session.stopping_value,value);assert.equal(saved.session.stopping_unit,unit);assert.equal(saved.session.stopping_page_number,unit==='page'?value:null);
  await call('PATCH',{sessionId,action:'review-later',words:[]});
  const result=await route.GET(new Request('http://local?'+new URLSearchParams(context),{headers:{authorization:'Bearer valid'}}));const restored=await result.json();
  assert.equal(restored.latestStoppingPoint.value,value);assert.equal(restored.latestStoppingPoint.unit,unit);
  await call('PATCH',{sessionId,action:'end-adding',saveStoppingPoint:false,stoppingValue:'1'});
  assert.equal(db.tables.live_lesson_capture_sessions[0].stopping_value,value);assert.equal(db.tables.live_lesson_capture_sessions.length,1);
  assert.ok(db.tables.live_lesson_capture_sessions.every(r=>r.user_book_id===otherCopy));
  assert.ok(!db.mutations.some(m=>m.table==='user_book_reading_sessions'));
 }
});
test('checkpoint canonical bounds, target method and session validation reject bad writes before mutation',async(t)=>{
 t.mock.method(console,'error',()=>{});
 for(const [unit,raw,supplied,status] of [['page','215','page',400],['page','2.5','page',400],['percent','101','percent',400],['percent','-1','percent',400],['kindle_location','1.5','kindle_location',400],['kindle_location','2501','kindle_location',400],['kindle_location','42','page',409]]) {
  const db=crossEditionDatabase();Object.assign(db.tables.user_books.find(r=>r.id===otherCopy),{progress_tracking_method:unit,books:{page_count:214,kindle_location_count:2500}});
  db.tables.live_lesson_capture_sessions.push({id:id(400),teacher_id:teacher,student_id:a,user_book_id:otherCopy,status:'capturing'});
  const route=load('app/api/teacher/live-lesson-words/route.ts',{'@supabase/supabase-js':{createClient:()=>db}});
  const result=await route.PATCH(new Request('http://local',{method:'PATCH',headers:{authorization:'Bearer valid','Content-Type':'application/json'},body:JSON.stringify({studentId:a,userBookId:otherCopy,sourceUserBookId:source,sessionId:id(400),action:'end-adding',saveStoppingPoint:true,stoppingValue:raw,stoppingUnit:supplied})}));
  assert.equal(result.status,status);assert.deepEqual(db.mutations,[]);
 }
});
test('checkpoint suggestions use only compatible current-session values, bounded by the target edition',()=>{
 const {suggestLessonStoppingPoint,readStoppingPoint,stoppingPointLabel,parseStoppingPoint}=load('lib/teacher/stoppingPoint.ts');
 for(const [unit,values,expected] of [['page',[34,35,37],'37'],['kindle_location',[1800,1832,1867],'1867'],['percent',[34,36,38],'38']]) {
  assert.equal(suggestLessonStoppingPoint(values.map(value=>({position_unit:unit,position_value:value})),unit),expected);
 }
 assert.equal(suggestLessonStoppingPoint([{position_unit:'page',position_value:42}],'kindle_location'),'');
 assert.equal(suggestLessonStoppingPoint([],'kindle_location'),'');
 assert.equal(suggestLessonStoppingPoint([{page_number:220}],'page',{page_count:214}),'');
 assert.equal(stoppingPointLabel(readStoppingPoint({stopping_page_number:42})),'Page 42');
 assert.equal(stoppingPointLabel(readStoppingPoint({stopping_unit:'kindle_location',stopping_value:1867})),'Location 1867');
 assert.equal(stoppingPointLabel(readStoppingPoint({stopping_unit:'percent',stopping_value:38})),'38%');
 assert.equal(parseStoppingPoint('0','percent').value,0);assert.equal(parseStoppingPoint('100%','percent').value,100);
});
