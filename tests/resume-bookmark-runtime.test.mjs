import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as bookmark from '../lib/books/resumeBookmark.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(file,deps={}){const exports={};new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>deps[name]??require(name),exports);return exports}
const progress=load('lib/books/readingProgress.ts');
const Section=load('components/books/ResumeBookmarkSection.tsx').default;

test('actual bookmark control renders optional, accessible, distinct top/end/phrase choices',()=>{
 for(const kind of ['page','top','end','phrase']){
  const html=renderToStaticMarkup(React.createElement(Section,{available:true,endingPage:44,kind,phrase:'家族',onKindChange(){},onPhraseChange(){}}));
  assert.match(html,/optional/);assert.doesNotMatch(html,/Skip bookmark/);assert.equal((html.match(/type="radio"/g)||[]).length,4);assert.match(html,new RegExp(`checked="" value="${kind}"`));
  assert.equal(html.includes('placeholder="A Japanese or English word or phrase"'),kind==='phrase');
  assert.match(html,/var\(--appearance-surface/);
 }
 assert.equal(renderToStaticMarkup(React.createElement(Section,{available:false})), '');
});

// Execute the real hook with controlled React lifecycle primitives and async services.
// No HTTP, SQL, or database connections are used.
async function harness(){
 let cells=[],index=0,effects=[],dirty=true,value,props=['book-a',true],owner='owner-a',authListener;
 const rows=new Map(),requests=[],held=[];let hold=false,fail=false,mounted=true;
 const eq=(a,b)=>a&&b&&a.length===b.length&&a.every((x,i)=>Object.is(x,b[i]));
 const fakeReact={
  useState(initial){const i=index++;if(!cells[i])cells[i]={v:typeof initial==='function'?initial():initial};return [cells[i].v,next=>{const v=typeof next==='function'?next(cells[i].v):next;if(!Object.is(v,cells[i].v)){cells[i].v=v;dirty=true}}]},
  useRef(initial){const i=index++;return cells[i]??(cells[i]={current:initial})},
  useCallback(fn,deps){const i=index++;if(!cells[i]||!eq(cells[i].deps,deps))cells[i]={deps,v:fn};return cells[i].v},
  useEffect(fn,deps){const i=index++;if(!cells[i]||!eq(cells[i].deps,deps)){const old=cells[i];cells[i]={deps,cleanup:old?.cleanup};effects.push(()=>{cells[i].cleanup?.();cells[i].cleanup=fn()})}},
 };
 const auth={getSession:async()=>({data:{session:owner?{user:{id:owner},access_token:owner}:null},error:null}),onAuthStateChange(fn){authListener=fn;return {data:{subscription:{unsubscribe(){}}}}}};
 const originalFetch=globalThis.fetch,originalWindow=globalThis.window;
 globalThis.window=new EventTarget();
 globalThis.fetch=async(url,options)=>{
  const key=options.headers.authorization+url,record={url,method:options.method,key,payload:options.body?JSON.parse(options.body):null};requests.push(record);
  const response={available:true,eligible:true,pageCount:45,bookmark:rows.get(key)??null}; // Snapshot at request time.
  const finish=()=>{if(options.method==='PUT'&&fail)return {ok:false,json:async()=>({error:'Synthetic write failure'})};if(options.method==='PUT'){response.bookmark=bookmark.resolveResumeBookmark(record.payload.kind,record.payload.endingPage,45,record.payload.phrase);rows.set(key,response.bookmark)}return {ok:true,json:async()=>response}};
  return hold?new Promise(resolve=>held.push(()=>resolve(finish()))):finish();
 };
 const hook=load('lib/books/useResumeBookmark.ts',{react:fakeReact,'@/lib/supabaseClient':{supabase:{auth}},'@/lib/books/readingProgress':progress}).useResumeBookmark;
 async function flush(){for(let i=0;i<20;i++){if(dirty&&mounted){dirty=false;index=0;value=hook(...props);for(const fn of effects.splice(0))fn()}await new Promise(r=>setImmediate(r));if(!dirty&&!effects.length)break}return value}
 await flush();
 return {get value(){return value},requests,flush,hold(v){hold=v},fail(v){fail=v},release(){held.splice(0).forEach(fn=>fn())},async book(id){props=[id,true];dirty=true;await flush()},async owner(id,event='SIGNED_IN'){owner=id;authListener(event,id?{user:{id}}:null);await flush()},async reload(){await value.refresh();await flush()},close(){mounted=false;for(const c of cells)c?.cleanup?.();globalThis.fetch=originalFetch;globalThis.window=originalWindow}};
}

test('actual hook saves/reloads top, end and phrase without altering session starting progress',async()=>{
 const h=await harness();try{
  assert.equal(h.value.bookmark,null);assert.equal(h.value.available,true);
  for(const kind of ['page','top','end','phrase']){
   h.value.setChoice(kind);h.value.setPhrase(' 家族 ');await h.flush();
   assert.equal((await h.value.save('44')).saved,true);await h.flush();await h.reload();
   assert.deepEqual(h.value.bookmark,bookmark.resolveResumeBookmark(kind,44,45,' 家族 '));
  }
  assert.ok(h.requests.every(r=>r.url.endsWith('/resume-bookmark')));
  const before=h.requests.length;h.value.skip();await h.flush();assert.equal(h.value.choice,'page');assert.equal((await h.value.save('45')).saved,true);await h.flush();assert.equal(h.requests.length,before+1);assert.deepEqual(h.value.bookmark,{kind:'page',page:45,phrase:null});
 }finally{h.close()}
});

test('failed bookmark writes retain selection/phrase and retry only the bookmark',async()=>{
 const h=await harness();try{
  h.value.setChoice('phrase');h.value.setPhrase('Unsaved phrase');await h.flush();h.fail(true);
  const result=await h.value.save('44');await h.flush();assert.match(result.error,/Synthetic/);assert.equal(h.value.choice,'phrase');assert.equal(h.value.phrase,'Unsaved phrase');assert.equal(h.value.canRetry,true);await h.reload();assert.equal(h.value.canRetry,true);assert.equal(h.value.phrase,'Unsaved phrase');
  h.value.setPhrase('Corrected retained phrase');await h.flush();h.fail(false);assert.equal((await h.value.retry()).saved,true);await h.flush();assert.equal(h.value.bookmark.phrase,'Corrected retained phrase');assert.equal(h.value.choice,'page');
  assert.equal(h.requests.filter(r=>r.method==='PUT').length,2);
 }finally{h.close()}
});

test('late book responses cannot replace current book state or drafts',async()=>{
 const h=await harness();try{
  h.hold(true);const old=h.value.refresh();await h.flush();await h.book('book-b');h.hold(false);h.release();await old;await h.flush();
  h.value.setChoice('top');await h.flush();await h.value.save('12');await h.flush();assert.equal(h.value.bookmark.page,12);assert.ok(h.requests.at(-1).url.includes('book-b'));
 }finally{h.close()}
});

test('account switching clears drafts and rejects late writes; same-owner auth refresh preserves drafts',async()=>{
 const h=await harness();try{
  h.value.setChoice('phrase');h.value.setPhrase('Owner A private draft');await h.flush();await h.owner('owner-a','TOKEN_REFRESHED');assert.equal(h.value.phrase,'Owner A private draft');
  h.hold(true);const old=h.value.save('20');await h.flush();await h.owner('owner-b');assert.equal(h.value.phrase,'');assert.equal(h.value.bookmark,null);
  h.hold(false);h.release();await old;await h.flush();assert.equal(h.value.bookmark,null);assert.equal(h.value.phrase,'');assert.equal(h.value.canRetry,false);
 }finally{h.close()}
});

test('actual API uses a per-request user JWT client and private relation without elevated credentials',async()=>{
 let missing=false,missingLibrary=false,denied=false,writes=0;const saved=new Map(),clients=[];
 const row={id:'book-a',user_id:'owner-a',progress_tracking_method:'page',books:{page_count:45,edition_format:'paperback'}};
 function createClient(url,key,options){
  assert.equal(key,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);assert.equal(options.auth.persistSession,false);assert.equal(options.auth.autoRefreshToken,false);
  const token=options.global.headers.Authorization.replace('Bearer ','');clients.push(token);
  return {auth:{getUser:async received=>{assert.equal(received,token);return {data:{user:token?{id:token}:null},error:null}}},from(table){
   assert.ok(['user_books','user_book_resume_bookmarks'].includes(table));let payload;const filters=[];
   const q={select(){return q},eq(k,v){filters.push([k,v]);return q},upsert(p,config){assert.equal(table,'user_book_resume_bookmarks');assert.equal(config.onConflict,'user_id,user_book_id');assert.equal(p.user_id,token);payload=p;return q},async maybeSingle(){
    if(table==='user_books'&&missingLibrary)return {data:null,error:{code:'42P01'}};
    if(table==='user_books')return {data:filters.every(([k,v])=>row[k]===v)?row:null,error:null};
    if(denied)return {data:null,error:{code:'42501'}};
    if(missing)return {data:null,error:{code:'PGRST205'}};
    if(payload){saved.set(payload.user_id+payload.user_book_id,payload);writes++}
    const value=saved.get(token+row.id)??null;return {data:value&&filters.every(([k,v])=>value[k]===v)?value:null,error:null};
   }};return q;
  }};
 }
 const route=load('app/api/books/[userBookId]/resume-bookmark/route.ts',{'next/server':{NextResponse:{json:(body,options)=>{assert.equal(options.headers['Cache-Control'],'private, no-store');return {body,status:options?.status??200}}}},'@supabase/supabase-js':{createClient},'@/lib/books/readingProgress':progress,'@/lib/books/resumeBookmark.mjs':bookmark});
 const context={params:Promise.resolve({userBookId:'book-a'})};
 const req=(owner='owner-a',payload)=>new Request('http://synthetic.invalid/book',{method:payload?'PUT':'GET',headers:owner?{authorization:'Bearer '+owner,'content-type':'application/json'}:{},...(payload?{body:JSON.stringify(payload)}:{})});
 assert.equal((await route.GET(req(''),context)).status,401);assert.equal((await route.GET(req('owner-b'),context)).status,404);
 assert.equal((await route.GET(req(),context)).body.bookmark,null);
 for(const kind of ['page','top','end','phrase']){const payload={kind,endingPage:44,phrase:'家族',user_id:'attacker-supplied-id'};assert.equal((await route.PUT(req('owner-a',payload),context)).status,200);assert.deepEqual((await route.GET(req(),context)).body.bookmark,bookmark.resolveResumeBookmark(kind,44,45,'家族'))}
 assert.equal((await route.PUT(req('owner-a',{kind:'phrase',endingPage:44,phrase:' '}),context)).status,400);
 row.progress_tracking_method='percent';assert.equal((await route.PUT(req('owner-a',{kind:'top',endingPage:44}),context)).status,400);
 row.progress_tracking_method='page';missing=true;assert.equal((await route.GET(req(),context)).body.available,false);assert.equal((await route.PUT(req('owner-a',{kind:'top',endingPage:44}),context)).status,409);assert.equal(writes,4);
 missing=false;denied=true;const originalError=console.error;console.error=()=>{};try{assert.equal((await route.GET(req(),context)).status,500);assert.equal((await route.PUT(req('owner-a',{kind:'top',endingPage:44}),context)).status,500);denied=false;missingLibrary=true;assert.equal((await route.GET(req(),context)).status,500)}finally{console.error=originalError}
 assert.ok(clients.includes('owner-b'));assert.ok(clients.filter(x=>x==='owner-a').length>1);
 const source=fs.readFileSync('app/api/books/[userBookId]/resume-bookmark/route.ts','utf8');assert.doesNotMatch(source,/SUPABASE_SERVICE_ROLE_KEY|supabaseAdmin/);
});



test('late write failures are ignored even after switching away from and back to the same book',async()=>{
 const h=await harness();try{
  h.value.setChoice('phrase');h.value.setPhrase('Old draft');await h.flush();h.hold(true);h.fail(true);
  const old=h.value.save('20');await h.flush();await h.book('book-b');await h.book('book-a');
  h.hold(false);h.release();await old;await h.flush();assert.equal(h.value.error,null);assert.equal(h.value.choice,'page');assert.equal(h.value.canRetry,false);
 }finally{h.close()}
});


test('default page-only draft does not write on opening; saving replaces older precise cue', async () => {
 const h=await harness();try{
  assert.equal(h.value.choice,'page');assert.equal(h.requests.filter(r=>r.method==='PUT').length,0);
  h.value.setChoice('phrase');h.value.setPhrase('Old precise location');await h.flush();await h.value.save('10');await h.flush();await h.reload();
  assert.equal(h.value.bookmark.phrase,'Old precise location');assert.equal(h.value.choice,'page');
  await h.value.save('14');await h.flush();await h.reload();
  assert.deepEqual(h.value.bookmark,{kind:'page',page:14,phrase:null});
 }finally{h.close()}
});
test('default page-only control is selected in actual rendered form', () => {
 const html=renderToStaticMarkup(React.createElement(Section,{available:true,endingPage:14,kind:'page',phrase:'',onKindChange(){},onPhraseChange(){}}));
 assert.match(html,/checked="" value="page"/);assert.match(html,/No specific location/);assert.doesNotMatch(html,/Skip bookmark|placeholder=/);
});
test('failed page-only write retains prior stored cue and retries the new page independently', async () => {
 const h=await harness();try{
  h.value.setChoice('phrase');h.value.setPhrase('Existing cue');await h.flush();await h.value.save('10');await h.flush();
  h.fail(true);assert.equal((await h.value.save('14')).saved,false);await h.flush();assert.equal(h.value.canRetry,true);assert.equal(h.value.choice,'page');assert.equal(h.value.bookmark.phrase,'Existing cue');
  h.fail(false);assert.equal((await h.value.retry()).saved,true);await h.flush();await h.reload();assert.deepEqual(h.value.bookmark,{kind:'page',page:14,phrase:null});
 }finally{h.close()}
});


test('empty optional session page does not write a bookmark or invent a page', async () => {
 const h=await harness();try{
  assert.equal((await h.value.save('')).skipped,true);await h.flush();
  assert.equal(h.requests.filter(r=>r.method==='PUT').length,0);assert.equal(h.value.canRetry,false);
 }finally{h.close()}
});
