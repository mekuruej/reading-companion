import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const file='lib/study/dailyLibraryReminder.ts';
const baseline=execFileSync('git',['show','4297612:'+file],{encoding:'utf8'});
function load(file,before=false,cache=new Map()){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);
 const source=before&&file.endsWith('/lib/study/dailyLibraryReminder.ts')?baseline:fs.readFileSync(file,'utf8');
 new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>name.startsWith('@/')?load(name.slice(2)+'.ts',before,cache):name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts',before,cache):require(name),module,module.exports);return module.exports;
}
const current=load(file),old=load(file,true);
const ast=ts.createSourceFile('fixture.js',fs.readFileSync('tests/daily-library-reminder.test.mjs','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const fixture=new Function('assert',ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='fixture').getText(ast)+';return fixture;')(assert);
const clock=(t,date='2026-10-28T03:00:00Z')=>t.mock.timers.enable({apis:['Date'],now:Date.parse(date)});
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const poolRow={study_identity_key:'reference||ご',surface:'語',reading:'ご',meaning:'word'};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function service(options={}, {pool,mutate,latency=0,holdPool,progressFailure=false}={}){
 const f=fixture(options),requests=[];const from=f.client.from.bind(f.client);
 f.client.from=table=>{const q=from(table);let proxy,fields,filters=[];
  proxy=new Proxy(q,{get(target,key){if(key==='then')return async(resolve,reject)=>{
   const r={table,fields,filters,start:performance.now()};requests.push(r);
   try{if(latency)await wait(latency);let result=await Promise.resolve(target);if(progressFailure&&table==='user_library_word_progress')result={...result,error:Error('synthetic')};if(mutate)result=mutate(r,result);resolve(result);}catch(error){reject(error);}finally{r.end=performance.now();}
  };const value=target[key];return typeof value==='function'?(...args)=>{if(key==='select')fields=args[0];if(['eq','in'].includes(key))filters.push([key,...args]);const result=value.apply(target,args);return result===target?proxy:result}:value;}});return proxy;
 };
 const rpc=f.client.rpc.bind(f.client);f.client.rpc=async(...args)=>{const r={table:'reference_pool',start:performance.now()};requests.push(r);if(latency)await wait(latency);if(holdPool)await holdPool();const result=await rpc(...args);r.end=performance.now();return pool===undefined?result:{data:pool,error:null};};
 const auth=f.client.auth.getUser.bind(f.client.auth);f.client.auth.getUser=async()=>{const r={table:'authentication',start:performance.now()};requests.push(r);if(latency)await wait(latency);const result=await auth();r.end=performance.now();return result;};
 return {...f,requests};
}
function assertLight(f){
 assert.ok(!f.requests.some(r=>['user_books','personal_user_book_words','user_library_word_claims'].includes(r.table)));
 assert.ok(!f.requests.some(r=>r.fields?.includes('last_studied_at')),'no full readiness progress queries');
 const progress=f.requests.filter(r=>r.table==='user_library_word_progress');assert.equal(progress.length,1);
 assert.ok(progress[0].filters.some(([op,k,v])=>op==='eq'&&k==='user_id'&&v==='u'));
 assert.ok(progress[0].filters.some(([op,k,v])=>op==='eq'&&k==='definition_key'&&v===''));
 assert.deepEqual(progress[0].filters.find(([op,k])=>op==='in'&&k==='study_identity_key')[2],['reference||ご']);
 assert.equal(f.requests.filter(r=>r.table==='profiles').length,1);assert.equal(f.requests.filter(r=>r.table==='user_learning_settings').length,1);assert.equal(f.requests.filter(r=>r.table==='personally_hidden_study_identities').length,1);
}
const invitation=loaded=>loaded?current.selectDailyLibraryReminder({...loaded,date:new Date(),ownLibrary:true,enabled:true,hidden:false}):null;
for(const date of ['2026-10-26T03:00:00Z','2026-10-28T03:00:00Z','2026-10-30T03:00:00Z'])test('scheduled sky is lightweight, even when full vocabulary would fail: '+date,async t=>{
 clock(t,date);const f=service({words:8510,queryFailure:true});const s=storage();s.setItem('library-study-seen-by-date','malformed');
 const loaded=await current.loadDailyLibraryReminder(f.client,'u',s);
 assert.equal(invitation(loaded),'word_sky');assert.deepEqual(loaded.readiness,{status:'not_evaluated',reason:'scheduled_word_sky',eligibleIdentityCount:null,dueCardCount:null,recommendAbilityCheck:false});assertLight(f);
});
for(const [options,expected] of [[{access:'free'},null],[{access:'expired'},null],[{access:'trial'},'word_sky'],[{},'word_sky'],[{role:'teacher'},'word_sky'],[{role:'admin'},'word_sky'],[{role:'super_teacher'},'word_sky']])test('scheduled sky preserves entitlement '+JSON.stringify(options),async t=>{
 clock(t);const f=service(options);const result=await current.loadDailyLibraryReminder(f.client,'u',storage());assert.equal(invitation(result),expected);if(expected)assertLight(f);else assert.ok(!f.requests.some(r=>r.table==='reference_pool'));
});
for(const date of ['2026-10-27T03:00:00Z','2026-10-29T03:00:00Z','2026-10-31T03:00:00Z','2026-11-01T03:00:00Z'])test('Check day retains baseline counts, thresholds and invitation: '+date,async t=>{
 clock(t,date);
 for(const [words,claims,expected] of [[99,10,'word_sky'],[100,9,'word_sky'],[100,10,'ability_check']]){
  const a=service({words,claims}),b=service({words,claims});const before=await old.loadDailyLibraryReminder(a.client,'u',storage()),after=await current.loadDailyLibraryReminder(b.client,'u',storage());assert.deepEqual(after,before);assert.equal(invitation(after),expected);assert.ok(b.requests.some(r=>r.table==='personal_user_book_words'));assert.equal(after.readiness.eligibleIdentityCount,words);assert.equal(after.readiness.dueCardCount,claims);
 }
 const f=service({queryFailure:true});const result=await current.loadDailyLibraryReminder(f.client,'u',storage());assert.equal(result.readiness.status,'unknown');assert.equal(invitation(result),null);
});
for(const [name,options,extra] of [['empty',{}, {pool:[]}],['hidden',{hiddenKeys:['reference||ご']},{}],['completed color',{summaryRows:[{id:'s',study_identity_key:'reference||ご',total_encounter_count:3}],skyProgress:[{id:'p',user_id:'u',study_identity_key:'reference||ご',reading_gate_status:'passed',meaning_gate_status:'not_started',mastered:false}]},{}]])test('verified '+name+' sky evaluates Check fallback',async t=>{
 clock(t);const f=service(options,extra),loaded=await current.loadDailyLibraryReminder(f.client,'u',storage());assert.equal(loaded.wordSkyAvailable,false);assert.equal(loaded.readiness.status,'ready');assert.equal(invitation(loaded),'ability_check');assert.ok(f.requests.some(r=>r.table==='personal_user_book_words'));
});
test('unavailable sky preserves below-threshold and unknown fallback distinctions',async t=>{
 clock(t);for(const [opts,status] of [[{words:99},'not_ready'],[{queryFailure:true},'unknown'],[{access:'trial'},'ineligible']]){
  const loaded=await current.loadDailyLibraryReminder(service(opts,{pool:[]}).client,'u',storage());assert.equal(loaded.readiness.status,status);assert.equal(invitation(loaded),null);
 }
});
for(const [name,options,extra] of [
 ['RPC error',{poolFailure:true},{}],['non-array',{}, {pool:{}}],['malformed row',{}, {pool:[{...poolRow,reading:' '}]}],['null row',{}, {pool:[null]}],['duplicate rows',{}, {pool:[poolRow,poolRow]}],['hidden failure',{visibilityFailure:true},{}],
 ['summary failure',{}, {mutate:(r,x)=>r.table==='user_library_word_summaries'?{...x,error:Error('synthetic')}:x}],
 ['summary incomplete',{}, {mutate:(r,x)=>r.table==='user_library_word_summaries'?{...x,count:1,data:[]}:x}],
 ['progress failure',{}, {progressFailure:true}],['progress incomplete',{}, {mutate:(r,x)=>r.table==='user_library_word_progress'?{...x,count:1,data:[]}:x}],
 ['hidden incomplete',{}, {mutate:(r,x)=>r.table==='personally_hidden_study_identities'?{...x,count:1,data:[]}:x}],
])test('unknown availability suppresses scheduled reminder, not Check fallback: '+name,async t=>{
 clock(t);const f=service(options,extra);assert.equal(await current.loadDailyLibraryReminder(f.client,'u',storage()),null);assert.ok(!f.requests.some(r=>['personal_user_book_words','user_book_words','user_library_word_claims','user_books'].includes(r.table)));assert.ok(!f.requests.some(r=>r.fields?.includes('last_studied_at')));
});
test('Check days retain independent ready Check when availability fails',async t=>{
 clock(t,'2026-10-29T03:00:00Z');const result=await current.loadDailyLibraryReminder(service({poolFailure:true}).client,'u',storage());assert.equal(invitation(result),'ability_check');assert.equal(result.readiness.status,'ready');
 const below=await current.loadDailyLibraryReminder(service({words:99,poolFailure:true}).client,'u',storage());assert.equal(invitation(below),null);
});
test('preferences, owner, route and daily dismissal guard the lightweight loader',async t=>{
 clock(t);for(const options of [{enabled:false},{settingsFailure:true}]){const f=service(options);assert.equal(await current.loadDailyLibraryReminder(f.client,'u',storage()),null);assert.ok(!f.requests.some(r=>r.table==='reference_pool'));}
 const s=storage();current.dismissDailyReminder(s,'u');const f=service();assert.equal(await current.loadDailyLibraryReminder(f.client,'u',s),null);assert.ok(!f.requests.some(r=>r.table==='reference_pool'));
 assert.equal(invitation(await current.loadDailyLibraryReminder(service().client,'u',s)),null);
 const other=storage();current.dismissDailyReminder(other,'other');assert.equal(invitation(await current.loadDailyLibraryReminder(service().client,'u',other)),'word_sky');
 const wrong=service();assert.equal(await current.loadDailyLibraryReminder(wrong.client,'other',storage()),null);assert.ok(!wrong.requests.some(r=>r.table==='reference_pool'));
 assert.equal(await current.loadDailyLibraryReminder(service({role:'teacher'}).client,'u',storage(),'/users/student/books'),null);
});
test('account switching before final publication discards old-owner data',async t=>{
 clock(t);const f=service({switched:true});assert.equal(await current.loadDailyLibraryReminder(f.client,'u',storage()),null);
 // New same-owner auth validations stay safe and do not force full readiness.
 const same=service();assert.equal(invitation(await current.loadDailyLibraryReminder(same.client,'u',storage())),'word_sky');assertLight(same);
});
for(const date of ['2026-10-28T14:59:59Z','2026-10-27T14:59:59Z'])test('crossing Tokyo midnight during loading discards stale-day result '+date,async t=>{
 clock(t,date);const f=service({}, {holdPool:async()=>t.mock.timers.tick(2000)});assert.equal(await current.loadDailyLibraryReminder(f.client,'u',storage()),null);
});
test('Tokyo weekday differs from UTC; yesterday dismissal expires and completion leaves sky intact',async t=>{
 clock(t,'2026-10-27T15:00:01Z');const s=storage();current.dismissDailyReminder(s,'u',new Date('2026-10-27T14:59:59Z'));
 const result=await current.loadDailyLibraryReminder(service().client,'u',s);assert.equal(invitation(result),'word_sky');assert.equal(current.selectDailyLibraryReminder({...result,date:new Date(),ownLibrary:true,enabled:true,hidden:false,abilityCheckCompleted:true}),'word_sky');
});
test('not_evaluated cannot become a low-readiness fallback, override hiding or grant access',t=>{
 clock(t);const base={date:new Date(),ownLibrary:true,enabled:true,hidden:false,canUseWordSky:true,wordSkyAvailable:true,canUseAbilityCheck:true,readiness:{status:'not_evaluated',reason:'scheduled_word_sky',eligibleIdentityCount:null,dueCardCount:null,recommendAbilityCheck:false}};
 assert.equal(current.selectDailyLibraryReminder(base),'word_sky');
 for(const extra of [{date:new Date('2026-10-29T03:00:00Z')},{ownLibrary:false},{enabled:false},{hidden:true},{canUseWordSky:false},{wordSkyAvailable:false},{readiness:{status:'unknown'}},{readiness:{status:'loading'}}])assert.equal(current.selectDailyLibraryReminder({...base,...extra}),null);
});
test('same-account Hide during loading prevents the final invitation',async t=>{
 clock(t);const s=storage();const f=service({}, {holdPool:async()=>current.dismissDailyReminder(s,'u')});assert.equal(await current.loadDailyLibraryReminder(f.client,'u',s),null);
});
test('same scheduler, cards, identities, access, Word Sky pool and component guards',()=>{
 for(const file of ['lib/study/dailyReminderReadiness.ts','lib/study/abilityCheckScheduler.ts','lib/study/abilityCheckCards.ts','lib/studySenseIdentity.ts','lib/access/featureAccess.ts','lib/access/appAccess.ts','lib/wordSkyExploration.ts','sql/20261015_word_sky_reference_pool_only.sql','app/(protected)/library-study/word-sky/page.tsx','app/(protected)/users/[username]/books/components/DailyLibraryReminder.tsx'])assert.equal(fs.readFileSync(file,'utf8'),execFileSync('git',['show','4297612:'+file],{encoding:'utf8'}));
});
test('synthetic 8510 occurrences / 7425 identities: scheduled request savings',async t=>{
 clock(t);const shape=(r,result)=>r.table==='personal_user_book_words'?{...result,data:result.data.map(w=>{const i=Number(w.id.slice(1))%7425;return {...w,surface:i===0?'コーヒー':'語'+i,reading:i===0?'コーヒー':'かな',study_identity_key:i===0?'コーヒー||こーひー':null};})}:result;
 const before=service({words:8510},{latency:10,mutate:shape}),after=service({words:8510},{latency:10,mutate:shape});const start=performance.now();const b=await old.loadDailyLibraryReminder(before.client,'u',storage());const mid=performance.now();const a=await current.loadDailyLibraryReminder(after.client,'u',storage());const end=performance.now();
 assert.equal(invitation(b),invitation(a));assert.equal(b.readiness.eligibleIdentityCount,7425);assert.equal(a.readiness.status,'not_evaluated');assertLight(after);
 const count=f=>({all:f.requests.length,vocabulary:f.requests.filter(r=>r.table==='personal_user_book_words').length,readinessProgress:f.requests.filter(r=>r.fields?.includes('last_studied_at')).length,hidden:f.requests.filter(r=>r.table==='personally_hidden_study_identities').length});
 assert.equal(count(before).all-count(after).all,124);assert.equal(count(before).readinessProgress,99);assert.equal(count(after).readinessProgress,0);
 t.diagnostic(JSON.stringify({syntheticOnly:true,latencyPerRequestMs:10,before:{ms:Math.round(mid-start),...count(before)},after:{ms:Math.round(end-mid),...count(after)}}));
});
