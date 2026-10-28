import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-27T03:00:00Z')});
const require=createRequire(import.meta.url);
const changed=['lib/vocabulary/loadAllPagedRows.ts','lib/study/dailyReminderReadiness.ts','lib/study/dailyLibraryReminder.ts'];
const beforeSources=new Map(changed.map(f=>[path.resolve(f),execFileSync('git',['show','77c362b:'+f],{encoding:'utf8'})]));
function load(file,before=false,cache=new Map()){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 const module={exports:{}};cache.set(file,module.exports);
 const source=before&&beforeSources.has(file)?beforeSources.get(file):fs.readFileSync(file,'utf8');
 new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>name.startsWith('@/')?load(name.slice(2)+'.ts',before,cache):name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts',before,cache):require(name),module,module.exports);return module.exports;
}
const current=load('lib/study/dailyLibraryReminder.ts'),old=load('lib/study/dailyLibraryReminder.ts',true);
const readiness=load('lib/study/dailyReminderReadiness.ts');
const {loadAllPagedRows}=load('lib/vocabulary/loadAllPagedRows.ts');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const store=()=>({getItem:()=>null});
const rows=n=>Array.from({length:n},(_,i)=>({id:'w'+i}));
function paged(n,{fault,failIndex=1,latency=2,concurrency=4}={}){
 const data=rows(n),requests=[];let active=0,max=0;
 const fetch=async(from,to)=>{
  const index=from/500,r={index,start:performance.now()};requests.push(r);active++;max=Math.max(max,active);
  try{
   await delay(index===1?latency*5:latency);
   let page=data.slice(from,to+1),count=n,error=null;
   if(index===failIndex){
    if(fault==='error')error=Error('synthetic');
    if(fault==='missing')page=page.slice(1);
    if(fault==='duplicate')page[0]=data[0];
    if(fault==='blank-id')page[0]={id:''};
    if(fault==='changed')count++;
    if(fault==='no-count')count=null;
   }
   return {data:page,count,error};
  }finally{r.end=performance.now();active--;}
 };
 return {run:()=>loadAllPagedRows(fetch,500,concurrency),data,requests,metrics:()=>({active,max})};
}
for(const n of [0,100,1000,8500,8510,20000])test('four-worker pages preserve complete order despite out-of-order arrivals: '+n,async()=>{
 const f=paged(n),result=await f.run();assert.deepEqual(result,f.data);assert.equal(f.requests.length,Math.max(1,Math.ceil(n/500)));assert.ok(f.metrics().max<=4);assert.equal(f.metrics().active,0);
 if(n>2500){assert.equal(f.metrics().max,4);assert.ok(f.requests[2].end<f.requests[1].end);}
});
for(const fault of ['error','missing','duplicate','blank-id','changed','no-count'])test('page '+fault+' stops new work and drains in-flight requests',async()=>{
 const f=paged(20000,{fault,failIndex:2,latency:5});await assert.rejects(f.run());assert.equal(f.metrics().active,0);assert.ok(f.requests.length<40);const count=f.requests.length;await delay(30);assert.equal(f.requests.length,count);
 // Any requests issued after the failed request finishes would violate stop-on-error.
 const failed=f.requests.find(r=>r.index===2);assert.ok(f.requests.every(r=>r.start<=failed.end));
});
test('default helper remains serial; invalid worker limits are rejected',async()=>{
 const f=paged(2500,{concurrency:1});await f.run();assert.equal(f.metrics().max,1);
 for(const workers of [0,5,Infinity,1.5])await assert.rejects(loadAllPagedRows(async()=>({data:[],count:0,error:null}),500,workers));
});
function fixtureFrom(file){const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);return new Function('assert',ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='fixture').getText(ast)+';return fixture;')(assert);}
const fixture=fixtureFrom('tests/daily-library-reminder.test.mjs');
function timedFixture(n,{latency=20,hiddenLatency=80,mutate=null,authSwitch=false}={}){
 const f=fixture({words:n}),requests=[];let active=0,max=0,vocabActive=0,maxVocab=0;const from=f.client.from.bind(f.client);
 f.client.from=table=>{const q=from(table);let proxy,start=0,end=Infinity,fields,orders=[];
  proxy=new Proxy(q,{get(target,key){if(key==='then')return async(resolve,reject)=>{
   const r={table,from:start,to:end,fields,orders,start:performance.now()};requests.push(r);active++;max=Math.max(max,active);
   const vocab=table==='personal_user_book_words';if(vocab){vocabActive++;maxVocab=Math.max(maxVocab,vocabActive);}
   try{await delay(table==='personally_hidden_study_identities'?hiddenLatency:latency);let result=await Promise.resolve(target);if(mutate)result=mutate(r,result);resolve(result);}catch(e){reject(e);}finally{r.end=performance.now();active--;if(vocab)vocabActive--;}
  };const v=target[key];return typeof v==='function'?(...args)=>{if(key==='range'){[start,end]=args;}if(key==='select')fields=args[0];if(key==='order')orders.push(args);const result=v.apply(target,args);return result===target?proxy:result}:v;
  }});return proxy;};
 const getUser=f.client.auth.getUser.bind(f.client.auth);f.client.auth.getUser=async()=>{const r={table:'authentication',start:performance.now()};requests.push(r);await delay(latency);const result=await getUser();r.end=performance.now();if(authSwitch&&requests.some(r=>r.table==='personal_user_book_words'&&r.from>0))result.data.user.id='other';return result;};
 const rpc=f.client.rpc.bind(f.client);f.client.rpc=async(...args)=>{const r={table:'reference_pool',start:performance.now()};requests.push(r);await delay(latency);const result=await rpc(...args);r.end=performance.now();return result;};
 return {...f,requests,metrics:()=>({active,max,maxVocab})};
}
async function measure(loader,n,options){const f=timedFixture(n,options),start=performance.now(),result=await loader(f.client,'u',store(),'/users/reader/books');const vocabulary=f.requests.filter(r=>r.table==='personal_user_book_words'),probe=vocabulary.find(r=>r.fields==='id');return {f,result,stats:{occurrences:n,totalMs:Math.round(performance.now()-start),vocabularyMs:Math.round(Math.max(...vocabulary.map(r=>r.end))-Math.min(...vocabulary.map(r=>r.start))),requests:f.requests.length,vocabularyRequests:vocabulary.length,maxVocabularyConcurrency:f.metrics().maxVocab,maxAllConcurrency:f.metrics().max,probeMs:Math.round(probe.end-probe.start),probeSortColumns:probe.orders.length,hiddenRequests:f.requests.filter(r=>r.table==='personally_hidden_study_identities').length}};}
for(const n of [100,1000,8500,17000])test('synthetic complete outer-loader parity and latency: '+n,async t=>{
 const before=await measure(old.loadDailyLibraryReminder,n),after=await measure(current.loadDailyLibraryReminder,n);
 assert.deepEqual(after.result,before.result);assert.equal(after.result.readiness.eligibleIdentityCount,n);assert.equal(after.f.metrics().active,0);
 assert.equal(after.stats.requests,before.stats.requests-1);assert.equal(after.stats.hiddenRequests,1);assert.equal(before.stats.hiddenRequests,2);assert.equal(after.stats.probeSortColumns,0);assert.equal(before.stats.probeSortColumns,3);
 assert.ok(after.stats.maxVocabularyConcurrency<=4);assert.equal(before.stats.maxVocabularyConcurrency,1);if(n>=8500){assert.equal(after.stats.maxVocabularyConcurrency,4);assert.ok(after.stats.vocabularyMs<before.stats.vocabularyMs*.65);}
 const pages=after.f.requests.filter(r=>r.table==='personal_user_book_words'&&r.to-r.from===499);assert.ok(pages.every(r=>r.orders.map(x=>x[0]).join(',')==='study_identity_key,created_at,id'));
 t.diagnostic(JSON.stringify({syntheticOnly:true,requestLatencyMs:20,hiddenLatencyMs:80,before:before.stats,after:after.stats}));
});
for(const fault of ['error','missing','duplicate','changed'])test('actual loader returns unknown for corrupt parallel vocabulary '+fault,async()=>{
 const f=timedFixture(8500,{latency:2,mutate:(r,result)=>{
  if(r.table!=='personal_user_book_words'||r.from!==500)return result;
  if(fault==='error')return {...result,error:Error('synthetic')};
  if(fault==='missing')return {...result,data:result.data.slice(1)};
  if(fault==='changed')return {...result,count:result.count+1};
  return {...result,data:[{...result.data[0],id:'w0'},...result.data.slice(1)]};
 }});const loaded=await current.loadDailyLibraryReminder(f.client,'u',store());assert.equal(loaded.readiness.status,'unknown');assert.equal(loaded.readiness.eligibleIdentityCount,null);assert.equal(f.metrics().active,0);assert.ok(f.requests.filter(r=>r.table==='personal_user_book_words').length<19);
});
test('account switch after parallel pages never publishes old-account readiness',async()=>{
 const f=timedFixture(2500,{latency:2,authSwitch:true});assert.equal(await current.loadDailyLibraryReminder(f.client,'u',store()),null);assert.equal(f.metrics().active,0);
});
test('shared hidden data is owner-bound, failures remain unknown, and separate loads re-read it',async()=>{
 const f=fixture({words:100});for(let i=0;i<2;i++)assert.ok(await current.loadDailyLibraryReminder(f.client,'u',store()));assert.equal(f.calls.filter(c=>c.table==='personally_hidden_study_identities').length,2);
 const broken=fixture({visibilityFailure:true});const loaded=await current.loadDailyLibraryReminder(broken.client,'u',store());assert.equal(loaded.readiness.status,'unknown');assert.equal(loaded.wordSkyAvailable,false);assert.equal(broken.calls.filter(c=>c.table==='personally_hidden_study_identities').length,1);
 let called=false;const shared={ownerId:'other',load:async()=>{called=true;return new Set();}};await assert.rejects(readiness.ownerHiddenIdentities(f.client,'u',shared));assert.equal(called,false);
 const hidden=fixture({words:0,claims:1,hiddenKeys:['コーヒー||こーひー']});const result=await current.loadDailyLibraryReminder(hidden.client,'u',store());assert.equal(result.readiness.eligibleIdentityCount,0);
});
test('identity calculations, dismissal, cards, scheduler, exploration and component stale guards unchanged',()=>{
 const functions=(source,names)=>{const ast=ts.createSourceFile('file.ts',source,ts.ScriptTarget.Latest,true);return ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText(ast));};
 for(const [file,names] of [['lib/study/dailyLibraryReminder.ts',['reminderHidden','dismissDailyReminder','reminderStudyContext','wordSkyReminderHref']],['lib/study/dailyReminderReadiness.ts',['recommendationIdentity','calculateDailyReminderReadiness']]])assert.deepEqual(functions(fs.readFileSync(file,'utf8'),names),functions(beforeSources.get(path.resolve(file)),names));
 for(const file of ['lib/study/abilityCheckCards.ts','lib/study/abilityCheckScheduler.ts','lib/wordSkyExploration.ts','app/(protected)/users/[username]/books/components/DailyLibraryReminder.tsx'])assert.equal(fs.readFileSync(file,'utf8'),execFileSync('git',['show','77c362b:'+file],{encoding:'utf8'}));
});
