import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 const module={exports:{}};cache.set(file,module.exports);
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',js)(name=>{
  if(name.startsWith('@/'))return load(name.slice(2)+'.ts');
  if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');
  return require(name);
 },module,module.exports);return module.exports;
}
const {calculateDailyReminderReadiness:calc,loadDailyReminderReadiness:loadReadiness,DAILY_REMINDER_READINESS_LOADING}=load('lib/study/dailyReminderReadiness.ts');
const {todayYmdAppTimeZone}=load('lib/timeZone.ts');
const {getFeatureAccess}=load('lib/access/featureAccess.ts');
const {canUseFullAccessFeature}=load('lib/access/requireFullAccess.ts');
const {senseStudyKey}=load('lib/studySenseIdentity.ts');
const {isCardAvailableForLibraryCheck}=load('lib/study/abilityCheckScheduler.ts');
const {buildReadingAbilityCheckCards,buildClaimAbilityCheckCards,studyIdentityKey}=load('lib/study/abilityCheckCards.ts');
const context=()=>({ownerId:'u',dayKey:todayYmdAppTimeZone(),seenTodayIds:new Set()});
const word=(i,extra={})=>({id:'w'+i,user_book_id:'b',surface:'語'+i,reading:'かな',meaning:'meaning',study_identity_key:'key'+i,meaning_choice_index:0,jlpt:'N5',hidden:false,flashcard_hidden:false,created_at:'2020-01-01T00:00:00Z',...extra});
const claim=(i,extra={})=>({id:'c'+i,user_id:'u',study_identity_key:'key'+i,surface:'語'+i,reading:'かな',meaning:'meaning',claimed_color:'green',created_at:'2020-01-01T00:00:00Z',updated_at:'2020-01-01T00:00:00Z',...extra});
const rows=n=>Array.from({length:n},(_,i)=>word(i));
const readyRows=n=>rows(n).flatMap(w=>[w,{...w,id:w.id+'b'},{...w,id:w.id+'c'}]);
const snapshot=(extra={})=>({status:'complete',ownerId:'u',canUseAbilityCheck:true,activityHasBooks:true,words:[],claims:[],progressRows:[],settings:{red_stages:1,orange_stages:1,yellow_stages:1,show_badge_numbers:true,skip_katakana_library_check:true},personallyHidden:new Set(),studyContext:context(),...extra});
const progress=(i,extra={})=>({id:'p'+i,user_id:'u',study_identity_key:'key'+i,definition_key:'',surface:'語'+i,reading:'かな',reading_gate_status:'not_started',meaning_gate_status:'not_started',held_before_reading_gate:false,held_before_meaning_gate:false,mastered:false,reading_gate_attempts:0,meaning_gate_attempts:0,last_studied_at:null,...extra});
test('99/100 reading-only and claim-only identities; both thresholds required',()=>{
 for(const source of ['words','claims']){
  const make=source==='words'?readyRows:n=>Array.from({length:n},(_,i)=>claim(i));
  const below=calc(snapshot({[source]:make(99)}));assert.equal(below.status,'not_ready');assert.equal(below.eligibleIdentityCount,99);
  const exact=calc(snapshot({[source]:make(100)}));assert.equal(exact.status,'ready');assert.equal(exact.dueCardCount,100);
 }
});
test('100 identities with exactly 9,10,11 currently due cards using actual sense-aware seen rules',()=>{
 for(const due of [9,10,11]){
  const seen=new Set(Array.from({length:100-due},(_,j)=>senseStudyKey('key'+(j+due))));
  const result=calc(snapshot({words:readyRows(100),studyContext:{...context(),seenTodayIds:seen}}));
  assert.equal(result.dueCardCount,due);assert.equal(result.recommendAbilityCheck,due>=10);
 }
});
test('overlap, duplicate occurrences, and separate meanings preserve cards but not extra identities',()=>{
 let result=calc(snapshot({words:rows(100),claims:Array.from({length:100},(_,i)=>claim(i))}));
 assert.equal(result.eligibleIdentityCount,100);assert.equal(result.dueCardCount,100);
 result=calc(snapshot({words:[word(0),word(0,{id:'duplicate'}),...['s2a','s2b','s2c'].map(id=>word(0,{id,meaning_choice_index:1,meaning:'other meaning'}))],claims:[claim(0)]}));
 assert.equal(result.eligibleIdentityCount,1);assert.equal(result.dueCardCount,2);
 const onlySecond=calc(snapshot({words:['s2a','s2b','s2c'].map(id=>word(0,{id,meaning_choice_index:1})),claims:[claim(0)]}));
 assert.equal(onlySecond.eligibleIdentityCount,1);assert.equal(onlySecond.dueCardCount,2);
});
test('DEMO4 shape: 106 occurrences, 99 identities, never 106 eligible identities',()=>{
 const result=calc(snapshot({words:[...rows(99),...rows(7).map((w,i)=>({...w,id:'duplicate'+i}))]}));
 assert.equal(result.eligibleIdentityCount,99);assert.equal(result.recommendAbilityCheck,false);
});
test('null/blank fields, non-Green claims, personal/global hiding, pinned identities and mixed visible encounters',()=>{
 const invalid=[];for(const field of ['surface','reading','meaning'])for(const value of [null,'',' \t '])invalid.push(word(invalid.length,{[field]:value}));
 assert.equal(calc(snapshot({words:invalid,claims:[claim(50,{reading:null}),claim(51,{claimed_color:'red'})]})).eligibleIdentityCount,0);
 const words=[word(1,{flashcard_hidden:true}),word(2,{hidden:true}),word(3,{study_identity_key:'pinned'}),word(3,{id:'mixed',study_identity_key:'pinned',flashcard_hidden:true})];
 const result=calc(snapshot({words,claims:[claim(1),claim(3,{study_identity_key:'pinned'})],personallyHidden:new Set(['key1'])}));
 assert.equal(result.eligibleIdentityCount,1);assert.equal(result.dueCardCount,1);
 assert.equal(calc(snapshot({words:[word(0,{study_identity_key:null})]})).eligibleIdentityCount,1);
});
test('unknown/loading/access/session states never look like zero words; old page caps produce unknown',()=>{
 assert.equal(DAILY_REMINDER_READINESS_LOADING.status,'loading');
 for(const state of [{status:'loading'},{status:'unknown'},snapshot({studyContext:null}),snapshot({studyContext:{...context(),ownerId:'other'}}),snapshot({studyContext:{...context(),dayKey:'2000-01-01'}}),snapshot({claims:Array.from({length:501},(_,i)=>claim(i))})]){
  const result=calc(state);assert.ok(['loading','unknown'].includes(result.status));assert.equal(result.eligibleIdentityCount,null);assert.equal(result.recommendAbilityCheck,false);
 }
 assert.equal(calc(snapshot({canUseAbilityCheck:false,words:rows(100)})).status,'ineligible');
});
test('current entitlement restrictions: free/trial denied, paid/staff retain access',()=>{
 for(const [input,allowed] of [[{},false],[{isTrialActive:true,hasFullAccess:true},false],[{hasFullAccess:true},true],[{role:'teacher'},true],[{role:'admin'},true]]){
  const entitled=canUseFullAccessFeature(getFeatureAccess(input),'ability_check');assert.equal(entitled,allowed);
  assert.equal(calc(snapshot({canUseAbilityCheck:entitled,words:readyRows(100)})).recommendAbilityCheck,allowed);
 }
});
test('due count is exactly the shared actual scheduler output, including sense history, rest, support and cooldown',()=>{
 const words=rows(100),claims=[claim(0),claim(1)],progressRows=[progress(0,{last_studied_at:new Date().toISOString()}),progress(1,{held_before_reading_gate:true,held_before_meaning_gate:true,reading_gate_attempts:2,last_studied_at:new Date().toISOString()}),progress(2,{reading_gate_status:'passed',meaning_gate_status:'passed',mastered:true})];
 const snap=snapshot({words,claims,progressRows});
 const groupedWords=load('lib/studySenseIdentity.ts').groupSavedSenseEncounters(words,studyIdentityKey);
 const progressByKey=new Map(progressRows.map(p=>[senseStudyKey(p.study_identity_key,p.definition_key),p]));
 const input={userId:'u',groupedWords,progressByKey,colorSettings:snap.settings};
 const cards=[...buildReadingAbilityCheckCards({...input,claimByKey:new Map(claims.map(c=>[c.study_identity_key,c])),metaById:new Map()}),...buildClaimAbilityCheckCards({...input,claimRows:claims,personallyHidden:new Set()})];
 assert.equal(calc(snap).dueCardCount,cards.filter(c=>isCardAvailableForLibraryCheck(c,'all',new Set())).length);
 assert.equal(isCardAvailableForLibraryCheck(cards[0],'all',new Set()),false);
});

// Stateful synthetic PostgREST services. No real database, auth or HTTP requests.
function fixture({words=rows(100),claims=[],progressRows=[],books=[{id:'b',user_id:'u'}],failure=null,truncate=false,changeCount=false,owner='u',switchOwner=false,profileError=false,settingsError=false,hiddenKeys=[],profileOverride={},authError=false,lateFailure=false,duplicatePage=false,missingCount=false,serverMaxRows=1000}={}){
 const calls=[];let authCalls=0;
 const profile={id:owner,role:'member',app_access_type:'reading_access',app_access_expires_at:null,...profileOverride};
 const client={auth:{async getUser(){authCalls++;return {data:{user:{id:switchOwner&&authCalls>1?'other':owner}},error:authError?Error('auth'):null};}},from(table){
  const filters=[],orders=[];let from=0,to=Infinity,single=false;
  const q={select(fields,opts){assert.equal(opts?.count,table==='profiles'||table==='user_learning_settings'?undefined:'exact');return q;},eq(k,v){filters.push([k,'eq',v]);return q;},in(k,v){filters.push([k,'in',v]);return q;},not(k,op,v){filters.push([k,'not',v]);return q;},or(v){assert.equal(v,'target_language_code.is.null,target_language_code.eq.ja');return q;},order(k){orders.push(k);return q;},limit(n){to=n-1;return q;},range(a,b){from=a;to=b;return q;},maybeSingle(){single=true;return q;},then(resolve,reject){
   calls.push({table,from,to,filters,orders});
   if(failure===table || (lateFailure&&table==='personal_user_book_words'&&from>0))return Promise.resolve({data:null,count:null,error:Error('synthetic failure')}).then(resolve,reject);
   if(table==='profiles')return Promise.resolve({data:profile,error:profileError?Error('profile'):null}).then(resolve,reject);
   if(table==='user_learning_settings')return Promise.resolve({data:null,error:settingsError?Error('settings'):null}).then(resolve,reject);
   let data=table==='user_books'?books:table==='personal_user_book_words'?words.filter(w=>w.finalized!==false&&(w.target_language_code==null||w.target_language_code==='ja')):table==='user_library_word_claims'?claims:table==='user_library_word_progress'?progressRows:table==='personally_hidden_study_identities'?hiddenKeys.map(study_identity_key=>({study_identity_key})):[];
   for(const [k,op,v] of filters)data=data.filter(r=>op==='eq'?r[k]===v:op==='in'?v.includes(r[k]):r[k]!==v);
   const count=data.length+(changeCount&&from>0?1:0);let page=data.slice(from,Math.min(to+1,from+serverMaxRows));if(duplicatePage&&table==='personal_user_book_words'&&from>0)page=data.slice(0,to-from+1);if(truncate&&table==='personal_user_book_words'&&from===0)page=page.slice(0,10);
   return Promise.resolve({data:page,count:missingCount?null:count,error:null}).then(resolve,reject);
  }};return q;
 }};return {client,calls};
}
test('complete >1000-word pagination, owner and finalization/language filters, no writes',async()=>{
 const f=fixture({words:[...rows(1201),word(2000,{finalized:false}),word(2001,{user_book_id:'other'}),word(2002,{target_language_code:'en'})]});
 const result=await loadReadiness(f.client,context());assert.equal(result.status,'not_ready');assert.equal(result.eligibleIdentityCount,1201);assert.equal(result.dueCardCount,0);
 assert.equal(f.calls.filter(c=>c.table==='personal_user_book_words').length,4);
 const vocabularyCalls=f.calls.filter(c=>c.table==='personal_user_book_words');
 assert.deepEqual(vocabularyCalls[0].orders,[],'discarded compatibility probe IDs need no sort');
 assert.ok(vocabularyCalls.slice(1).every(c=>c.orders.includes('id')));
 assert.ok(vocabularyCalls.every(c=>c.filters.some(x=>x[0]==='user_book_id')));
 assert.ok(f.calls.filter(c=>['user_library_word_claims','user_library_word_progress','user_books'].includes(c.table)).every(c=>c.filters.some(x=>x[0]==='user_id'&&x[2]==='u')));
});
test('pagination/query/count/profile/settings/session failures are unknown, never not_ready',async()=>{
 for(const options of [{failure:'personal_user_book_words'},{failure:'user_library_word_claims'},{failure:'personally_hidden_study_identities'},{failure:'user_library_word_progress'},{truncate:true},{words:rows(601),changeCount:true},{switchOwner:true},{profileError:true},{settingsError:true},{words:rows(1201),lateFailure:true},{words:rows(1201),duplicatePage:true},{missingCount:true}]){
  const f=fixture(options),result=await loadReadiness(f.client,context());assert.equal(result.status,'unknown',JSON.stringify(options));assert.equal(result.eligibleIdentityCount,null);assert.equal(result.recommendAbilityCheck,false);
 }
});
test('same-owner empty complete library is known zero; wrong-owner context avoids vocabulary reads',async()=>{
 const f=fixture({words:[]});let result=await loadReadiness(f.client,context());assert.equal(result.status,'not_ready');assert.equal(result.eligibleIdentityCount,0);
 const wrong=fixture();result=await loadReadiness(wrong.client,{...context(),ownerId:'other'});assert.equal(result.status,'unknown');assert.ok(!wrong.calls.some(c=>c.table==='personal_user_book_words'));
});
test('more than current page book/claim caps returns unknown rather than overstating real activity availability',async()=>{
 for(const options of [{books:Array.from({length:1001},(_,i)=>({id:'b'+i,user_id:'u'}))},{claims:Array.from({length:501},(_,i)=>claim(i))}]){
  const result=await loadReadiness(fixture(options).client,context());assert.equal(result.status,'unknown');assert.equal(result.dueCardCount,null);
 }
});
test('separately batched books retain newest representative and pinned precedence for seen-ID parity',()=>{
 const old=word(0,{id:'old',created_at:'2010-01-01T00:00:00Z'}),newest=word(0,{id:'new',user_book_id:'second-book',created_at:'2020-01-01T00:00:00Z'});
 const result=calc(snapshot({words:[old,newest,word(0,{id:'third'})],claims:[claim(0)],studyContext:{...context(),seenTodayIds:new Set(['new'])}}));
 assert.equal(result.dueCardCount,0);
 const pinned=word(0,{id:'pinned',study_identity_key:'key0',created_at:'2000-01-01T00:00:00Z'});
 const derived=word(0,{id:'derived',study_identity_key:null,surface:'key0',reading:'かな',created_at:'2024-01-01T00:00:00Z'});
 // Use a real canonical fallback shared with the pinned identity.
 pinned.study_identity_key='key0||かな';
 const mixed=calc(snapshot({words:[derived,pinned],claims:[claim(0,{study_identity_key:'key0||かな'})],studyContext:{...context(),seenTodayIds:new Set(['pinned'])}}));
 assert.equal(mixed.eligibleIdentityCount,1);assert.equal(mixed.dueCardCount,0);
});
test('loader preserves corrected hidden identities; neither all-hidden words nor matching claims reappear',async()=>{
 const result=await loadReadiness(fixture({words:[word(0,{flashcard_hidden:true})],claims:[claim(0)],hiddenKeys:['key0']}).client,context());
 assert.equal(result.status,'not_ready');assert.equal(result.eligibleIdentityCount,0);assert.equal(result.dueCardCount,0);
 const mixed=await loadReadiness(fixture({words:[word(0,{flashcard_hidden:true}),word(0,{id:'visible'})],claims:[claim(0)]}).client,context());
 assert.equal(mixed.eligibleIdentityCount,1);assert.equal(mixed.dueCardCount,1);
});
test('progress exceeding the actual page response cap is unknown, even though pagination can retrieve it',async()=>{
 const progressRows=Array.from({length:1001},(_,i)=>progress(0,{id:'p'+i,definition_key:String(i)}));
 const result=await loadReadiness(fixture({progressRows}).client,context());
 assert.equal(result.status,'unknown');assert.equal(result.reason,'ability_check_progress_cap');
});
test('batched representative order preserves PostgreSQL microseconds and descending null placement',()=>{
 for(const [aTime,bTime] of [['2020-01-01T00:00:00.000001+00:00','2020-01-01T00:00:00.000002+00:00'],['2020-01-01T00:00:00Z',null]]){
  const snap=snapshot({words:[word(0,{id:'a',created_at:aTime}),word(0,{id:'b',created_at:bTime})],claims:[claim(0)],studyContext:{...context(),seenTodayIds:new Set(['b'])}});
  assert.equal(calc(snap).dueCardCount,0);
 }
});
test('Green-only vocabulary works with an existing book; no-book page early-return yields unknown, not a false recommendation',async()=>{
 const claims=Array.from({length:100},(_,i)=>claim(i));
 const supported=await loadReadiness(fixture({words:[],claims}).client,context());assert.equal(supported.status,'ready');assert.equal(supported.eligibleIdentityCount,100);
 const unsupported=await loadReadiness(fixture({books:[],words:[],claims}).client,context());assert.equal(unsupported.status,'unknown');assert.equal(unsupported.reason,'ability_check_empty_library');
});
test('loader enforces actual free/trial/expired/staff access before reading vocabulary',async()=>{
 for(const profileOverride of [{app_access_type:'free'},{app_access_type:'inactive'},{app_access_type:'trial',app_access_expires_at:'2050-01-01T00:00:00Z'},{app_access_type:'reading_access',app_access_expires_at:'2000-01-01T00:00:00Z'}]){
  const f=fixture({profileOverride});const result=await loadReadiness(f.client,context());assert.equal(result.status,'ineligible');assert.ok(!f.calls.some(c=>c.table==='personal_user_book_words'));
 }
 const staff=await loadReadiness(fixture({profileOverride:{role:'teacher',app_access_type:'free'},claims:Array.from({length:100},(_,i)=>claim(i))}).client,context());assert.equal(staff.status,'ready');
 const authFailure=await loadReadiness(fixture({authError:true}).client,context());assert.equal(authFailure.status,'unknown');
 const wrongProfile=await loadReadiness(fixture({profileOverride:{id:'other'}}).client,context());assert.equal(wrongProfile.status,'unknown');
});
test('another owner vocabulary, claims and progress never enter the owner result',async()=>{
 const f=fixture({books:[{id:'b',user_id:'u'},{id:'other-book',user_id:'other'}],words:[word(0),word(1,{user_book_id:'other-book'})],claims:[claim(5,{user_id:'other'})],progressRows:[progress(0,{user_id:'other',mastered:true})]});
 const result=await loadReadiness(f.client,context());assert.equal(result.eligibleIdentityCount,1);assert.equal(result.dueCardCount,0);
});
test('lower server caps cannot make foundation recommend cards the actual page would truncate',async()=>{
 for(const options of [{words:rows(1201),serverMaxRows:500},{books:Array.from({length:601},(_,i)=>({id:'b'+i,user_id:'u'})),serverMaxRows:500},{progressRows:Array.from({length:601},(_,i)=>progress(0,{id:'p'+i,definition_key:String(i)})),serverMaxRows:500}]){
  const result=await loadReadiness(fixture(options).client,context());assert.equal(result.status,'unknown');assert.equal(result.eligibleIdentityCount,null);
 }
});

function canonicalOverlap(n=99, due=10) {
 const words=Array.from({length:n},(_,i)=>word(i,{study_identity_key:null,...(i===0?{surface:'コーヒー',reading:'コーヒー'}:{})}));
 const claims=Array.from({length:due},(_,i)=>claim(i,{study_identity_key:i===0?'コーヒー||こーひー':`語${i}||かな`,...(i===0?{surface:'コーヒー',reading:'コーヒー'}:{})}));
 return snapshot({words,claims});
}
test('canonical coffee overlap: 99 identities and 10 actual due cards must not recommend',()=>{
 const result=calc(canonicalOverlap());
 assert.equal(result.dueCardCount,10);
 assert.equal(result.eligibleIdentityCount,99);
 assert.equal(result.recommendAbilityCheck,false);
});
test('canonical boundary: 100 identities needs 10 actual due cards',()=>{
 for(const due of [9,10]) {const result=calc(canonicalOverlap(100,due));assert.equal(result.eligibleIdentityCount,100);assert.equal(result.dueCardCount,due);assert.equal(result.recommendAbilityCheck,due===10);}
});

test('recommendation identity matches established SQL function, including kana, long vowels, whitespace and pinned keys',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');
 const db=new PGlite();
 const sql=fs.readFileSync('sql/20260501_library_word_summaries_01_table.sql','utf8');
 await db.exec(sql.match(/create or replace function public\.library_study_identity_key[\s\S]*?\$identity_key\$;/)[0]);
 const {recommendationIdentity}=load('lib/study/dailyReminderReadiness.ts');
 try {
  for(const [surface,reading] of [[null,null],['',''],['  Word  A  ',' コー ヒー '],['語','カタカナ'],['語','かたかな'],['語','ヵヶヴヲヰヱ'],['語','ｶﾀｶﾅ'],['語','コ・ー･ヒー'],[' A\t B\n','\tカ\n ナ\r'],['語','coffee'],['語','かな\u3000カナ'],['語','かな\u00a0カナ'],['語','カ\u0301ナ']]) {
   const result=await db.query('select public.library_study_identity_key($1,$2) as key',[surface,reading]);
   assert.equal(recommendationIdentity({surface,reading,study_identity_key:null}),result.rows[0].key,JSON.stringify([surface,reading]));
  }
  assert.equal(recommendationIdentity({surface:'新綴り',reading:'シン',study_identity_key:'original||pinned'}),'original||pinned');
  assert.equal(recommendationIdentity({surface:'語',reading:'かな',study_identity_key:''}),'');
 }finally{await db.close();}
});

test('canonical tally preserves opaque pinned identities and counts collapsed canonical reading forms',()=>{
 const result=calc(snapshot({words:[word(0,{study_identity_key:'old||pinned',surface:'コーヒー',reading:'コーヒー'})],claims:[claim(0,{study_identity_key:'old||pinned'}),claim(1,{study_identity_key:'コーヒー||こーひー',surface:'コーヒー',reading:'コーヒー'})]}));
 assert.equal(result.eligibleIdentityCount,2);
 const collapsed=calc(snapshot({words:[word(0,{study_identity_key:null,reading:'カーナ'}),word(0,{id:'other',study_identity_key:null,reading:'カナ'})]}));
 assert.equal(collapsed.eligibleIdentityCount,2);
});
