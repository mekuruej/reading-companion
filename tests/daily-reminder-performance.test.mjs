import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const baseline=execFileSync('git',['show','3b953fe:lib/study/dailyReminderReadiness.ts'],{encoding:'utf8'});
function load(file,original=false,cache=new Map()){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 const module={exports:{}};cache.set(file,module.exports);
 const source=original&&file.endsWith('/lib/study/dailyReminderReadiness.ts')?baseline:fs.readFileSync(file,'utf8');
 new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>name.startsWith('@/')?load(name.slice(2)+'.ts',original,cache):name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts',original,cache):require(name),module,module.exports);return module.exports;
}
const current=load('lib/study/dailyReminderReadiness.ts'),old=load('lib/study/dailyReminderReadiness.ts',true);
const {todayYmdAppTimeZone}=load('lib/timeZone.ts');
const context=()=>({ownerId:'u',dayKey:todayYmdAppTimeZone(),seenTodayIds:new Set()});
const ast=ts.createSourceFile('fixture.js',fs.readFileSync('tests/daily-reminder-readiness.test.mjs','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const fixtureText=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='fixture').getText(ast);
const fixture=new Function('assert',fixtureText+';return fixture;')(assert);
const word=i=>({id:'w'+i,user_book_id:'b',study_identity_key:'key'+i,surface:'語'+i,reading:'かな',meaning:'meaning',meaning_choice_index:0,hidden:false,flashcard_hidden:false,created_at:'2020-01-01T00:00:00Z'});
const progress=i=>({id:'p'+i,user_id:'u',study_identity_key:'key'+i,definition_key:'',surface:'語'+i,reading:'かな',reading_gate_status:'not_started',meaning_gate_status:'not_started',held_before_reading_gate:false,held_before_meaning_gate:false,mastered:false,reading_gate_attempts:0,meaning_gate_attempts:0,last_studied_at:null});
const claims=n=>Array.from({length:n},(_,i)=>({id:'c'+i,user_id:'u',study_identity_key:'key'+i,surface:'語'+i,reading:'かな',meaning:'meaning',claimed_color:'green',created_at:'2020-01-01',updated_at:'2020-01-01'}));
function timedFixture(n,{latency=5,failAt=null,wrongOwnerAt=null,truncateAt=null,slowFirst=false}={}){
 const f=fixture({words:Array.from({length:n},(_,i)=>word(i)),claims:claims(Math.min(n,10)),progressRows:Array.from({length:n},(_,i)=>progress(i))});
 const requests=[];let active=0,maxActive=0,progressActive=0,maxProgress=0,progressIssued=0;
 const from=f.client.from.bind(f.client);
 f.client.from=table=>{
  const q=from(table);let proxy,batchKeys;
  proxy=new Proxy(q,{get(target,key){
   if(key==='then')return async(resolve,reject)=>{
    const index=table==='user_library_word_progress'?progressIssued++:null;
    const r={table,index,keys:batchKeys,start:performance.now()};requests.push(r);
    active++;maxActive=Math.max(active,maxActive);if(index!==null){progressActive++;maxProgress=Math.max(maxProgress,progressActive)}
    let result;
    try{await new Promise(r=>setTimeout(r,latency+(slowFirst&&index===0?latency*3:0)));result=await Promise.resolve(target);
     if(index!==null&&index===failAt)result={data:null,count:null,error:Error('synthetic')};
     if(index!==null&&index===wrongOwnerAt)result={...result,data:result.data.map(p=>({...p,user_id:'other'}))};
     if(index!==null&&index===truncateAt)result={...result,data:result.data.slice(1)};
    }catch(e){reject(e);return}finally{active--;if(index!==null)progressActive--;r.end=performance.now()}
    resolve(result);
   };
   const v=target[key];return typeof v==='function'?(...args)=>{if(key==='in')batchKeys=args[1];const result=v.apply(target,args);return result===target?proxy:result}:v;
  }});return proxy;
 };
 const auth=f.client.auth.getUser.bind(f.client.auth);f.client.auth.getUser=async()=>{const r={table:'authentication',start:performance.now()};requests.push(r);await new Promise(r=>setTimeout(r,latency));const result=await auth();r.end=performance.now();return result};
 return {client:f.client,requests,metrics:()=>({requestCount:requests.length,progressRequests:progressIssued,maxConcurrent:maxActive,maxProgressConcurrent:maxProgress,outstanding:active})};
}
async function measure(loader,n,options){const f=timedFixture(n,options);const start=performance.now();const result=await loader(f.client,context());const elapsedMs=Math.round(performance.now()-start);const phaseMs={},phaseSpanMs={};for(const r of f.requests){phaseMs[r.table]=Math.round((phaseMs[r.table]??0)+(r.end-r.start));const same=f.requests.filter(q=>q.table===r.table);phaseSpanMs[r.table]=Math.round(Math.max(...same.map(q=>q.end))-Math.min(...same.map(q=>q.start)))}return {result,elapsedMs,calculationMs:Math.round(performance.now()-f.requests.at(-1).end),phaseCumulativeMs:phaseMs,phaseSpanMs,...f.metrics(),requests:f.requests};}
for(const n of [100,1000,7425])test(`before/after latency and complete result parity: ${n} identities`,async t=>{
 const before=await measure(old.loadDailyReminderReadiness,n,{latency:80});
 const after=await measure(current.loadDailyReminderReadiness,n,{latency:80});
 assert.deepEqual(after.result,before.result);assert.equal(after.result.eligibleIdentityCount,n);assert.equal(after.result.dueCardCount,10);
 assert.equal(after.progressRequests,Math.ceil(n/75));assert.equal(after.requestCount,before.requestCount);assert.equal(after.outstanding,0);
 assert.ok(after.maxProgressConcurrent<=4);if(n>75)assert.ok(after.maxProgressConcurrent>1,'independent progress reads must overlap');
 const keys=after.requests.filter(r=>r.table==='user_library_word_progress').flatMap(r=>r.keys);assert.equal(keys.length,n);assert.equal(new Set(keys).size,n);
 if(n===7425)assert.ok(after.elapsedMs<before.elapsedMs*.65,'99 batches should no longer accumulate serial latency');
 const {requests:a,...aStats}=after,{requests:b,...bStats}=before;t.diagnostic(JSON.stringify({latencyMs:80,identities:n,before:bStats,after:aStats}));
});
test('out-of-order progress completion retains the exact reading/claim result',async()=>{
 const before=await measure(old.loadDailyReminderReadiness,400,{latency:5});
 const after=await measure(current.loadDailyReminderReadiness,400,{latency:5,slowFirst:true});
 assert.deepEqual(after.result,before.result);
 const requests=after.requests.filter(r=>r.table==='user_library_word_progress');assert.ok(requests[1].end<requests[0].end);
});
for(const extra of [{failAt:0},{failAt:4},{wrongOwnerAt:1},{truncateAt:2}])test('concurrent failure is unknown and leaves no requests running: '+JSON.stringify(extra),async()=>{
 const f=timedFixture(7425,{...extra,latency:5,slowFirst:true});const result=await current.loadDailyReminderReadiness(f.client,context());
 assert.equal(result.status,'unknown');assert.equal(result.recommendAbilityCheck,false);assert.equal(result.eligibleIdentityCount,null);assert.equal(f.metrics().outstanding,0);
 const count=f.requests.length;await new Promise(r=>setTimeout(r,30));assert.equal(f.requests.length,count,'no new work after failure returns');assert.ok(f.metrics().maxProgressConcurrent<=4);
 assert.ok(f.metrics().progressRequests<99,'stop assigning new batches after a failure');
});
test('readiness calculation, cards and scheduler remain unchanged',()=>{
 function calculation(text){const root=ts.createSourceFile('readiness.ts',text,ts.ScriptTarget.Latest,true);return root.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='calculateDailyReminderReadiness').getText(root)}
 assert.equal(calculation(fs.readFileSync('lib/study/dailyReminderReadiness.ts','utf8')),calculation(baseline));
 for(const file of ['lib/study/abilityCheckCards.ts','lib/study/abilityCheckScheduler.ts','lib/study/dailyLibraryReminder.ts','app/(protected)/users/[username]/books/components/DailyLibraryReminder.tsx'])assert.equal(fs.readFileSync(file,'utf8'),execFileSync('git',['show','3b953fe:'+file],{encoding:'utf8'}));
});
test('all selected database columns remain identical to the staged loader',()=>{
 const selections=text=>{
  const source=ts.createSourceFile('loader.ts',text,ts.ScriptTarget.Latest,true),found=[];
  function visit(n){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='select')found.push(n.arguments[0].getText(source));ts.forEachChild(n,visit)}visit(source);return found;
 };
 assert.deepEqual(selections(fs.readFileSync('lib/study/dailyReminderReadiness.ts','utf8')),selections(baseline));
});
