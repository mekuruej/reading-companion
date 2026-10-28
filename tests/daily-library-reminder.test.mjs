import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-27T03:00:00Z')});
const require=createRequire(import.meta.url),cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 const module={exports:{}};cache.set(file,module.exports);
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',js)(name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name),module,module.exports);return module.exports;
}
const {selectDailyLibraryReminder:select, reminderHidden,dismissDailyReminder,reminderStudyContext,wordSkyReminderHref,loadDailyLibraryReminder}=load('lib/study/dailyLibraryReminder.ts');
const {getWordSkyLibraryReturnState,isWordSkyExploration,getWordSkyExplorationReturnPath}=load('lib/wordSkyExploration.ts');
const {ymdInTimeZone}=load('lib/timeZone.ts');
const known=(ready=true)=>({status:ready?'ready':'not_ready',eligibleIdentityCount:ready?100:99,dueCardCount:10,recommendAbilityCheck:ready});
const input=(extra={})=>({date:new Date('2026-10-26T03:00:00Z'),ownLibrary:true,enabled:true,hidden:false,canUseWordSky:true,wordSkyAvailable:true,canUseAbilityCheck:true,readiness:known(),...extra});
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('all seven weekdays follow Tokyo schedule, without blocking manual activity access',()=>{
 const expected=['word_sky','ability_check','word_sky','ability_check','word_sky','ability_check','ability_check'];
 for(let i=0;i<7;i++)assert.equal(select(input({date:new Date(Date.UTC(2026,9,26+i,3))})),expected[i]);
 // UTC Monday afternoon is already Tokyo Tuesday.
 assert.equal(select(input({date:new Date('2026-10-26T15:00:00Z')})),'ability_check');
});
test('both readiness boundaries remain required; not-ready users get accessible Word Sky daily',()=>{
 for(const [identities,due,ready] of [[100,10,true],[99,10,false],[100,9,false]]){
  const readiness={status:ready?'ready':'not_ready',eligibleIdentityCount:identities,dueCardCount:due,recommendAbilityCheck:ready};
  assert.equal(select(input({date:new Date('2026-10-27T03:00:00Z'),readiness})),ready?'ability_check':'word_sky');
 }
});
test('independent entitlement and availability fallbacks; no inaccessible suggestion',()=>{
 assert.equal(select(input({canUseWordSky:false})),'ability_check');
 assert.equal(select(input({wordSkyAvailable:false})),'ability_check');
 assert.equal(select(input({canUseAbilityCheck:false,readiness:{status:'ineligible'}})),'word_sky');
 assert.equal(select(input({canUseAbilityCheck:false,canUseWordSky:false})),null);
 assert.equal(select(input({canUseAbilityCheck:false,wordSkyAvailable:false})),null);
 assert.equal(select(input({readiness:known(false),wordSkyAvailable:false})),null);
});
test('unknown/loading is never beginner status, teacher/student Libraries and disabled/hidden invitations stay silent',()=>{
 for(const status of ['loading','unknown'])assert.equal(select(input({readiness:{status}})),null);
 for(const extra of [{ownLibrary:false},{enabled:false},{hidden:true}])assert.equal(select(input(extra)),null);
});
test('Hide for today covers both activities, is owner-specific, and resets at exact Tokyo midnight',()=>{
 const storage=memory(),before=new Date('2026-10-26T14:59:59Z'),after=new Date('2026-10-26T15:00:00Z');
 assert.equal(dismissDailyReminder(storage,'owner-A',before),true);
 assert.equal(reminderHidden(storage,'owner-A',before),true);assert.equal(reminderHidden(storage,'owner-B',before),false);
 for(const date of [before,new Date('2026-10-26T10:00:00Z')])assert.equal(select(input({date,hidden:reminderHidden(storage,'owner-A',date)})),null);
 assert.equal(reminderHidden(storage,'owner-A',after),false);
 assert.equal(select(input({date:after,hidden:reminderHidden(storage,'owner-A',after)})),'ability_check');
 assert.equal(reminderHidden(storage,'owner-B',after),false);
});
test('storage failures are graceful; scheduler storage is read-only and malformed state is unknown',()=>{
 const failed={getItem(){throw Error('unavailable')},setItem(){throw Error('unavailable')}};
 assert.equal(dismissDailyReminder(failed,'u'),false);assert.equal(reminderHidden(failed,'u'),false);assert.equal(reminderStudyContext(failed,'u'),null);
 const store=memory();assert.equal(reminderStudyContext(store,'u').seenTodayIds.size,0);
 store.setItem('library-study-seen-by-date','broken');assert.equal(reminderStudyContext(store,'u'),null);
 store.setItem('library-study-seen-by-date',JSON.stringify({[ymdInTimeZone()]:[5]}));assert.equal(reminderStudyContext(store,'u'),null);
 store.setItem('library-study-seen-by-date',JSON.stringify({[ymdInTimeZone()]:['card','sense::2']}));assert.deepEqual([...reminderStudyContext(store,'u').seenTodayIds],['card','sense::2']);
});
test('exploration links preserve validated Library search/filter/sort/view state and legacy links remain open-ended',()=>{
 const state={search:'雪 & rain',bookType:'all',status:'reading',sort:'title',view:'list'};
 const url=new URL(wordSkyReminderHref('/users/reader/books',state),'https://fixture.invalid');
 assert.equal(url.pathname,'/library-study/word-sky');assert.equal(url.searchParams.get('explore'),'1');
 const ret=url.searchParams.get('returnTo');assert.equal(getWordSkyExplorationReturnPath(ret),ret);
 assert.deepEqual(getWordSkyLibraryReturnState(new URL(ret,'https://fixture.invalid').search),state);
 for(const unsafe of ['https://evil.invalid','//evil.invalid','/books/../../admin','/users/a%2fb/books']){
  assert.equal(new URL(wordSkyReminderHref(unsafe,state),'https://fixture.invalid').searchParams.get('returnTo').split('?')[0],'/books');
 }
 assert.equal(isWordSkyExploration('1'),true);assert.equal(isWordSkyExploration('5'),true);
});

// Synthetic read-only PostgREST services exercise the actual loader and readiness foundation.
function fixture({role='member',access='reading_access',enabled=true,settingsFailure=false,poolFailure=false,words=100,claims=10,queryFailure=false,switched=false,hiddenKeys=[],summaryRows=[],skyProgress=[],visibilityFailure=false}={}){
 const calls=[];let authCalls=0;
 const profile={id:'u',username:'reader',role,app_access_type:access,app_access_expires_at:access==='expired'?'2020-01-01':'2099-01-01'};
 if(access==='expired')profile.app_access_type='reading_access';
 const wordRows=Array.from({length:words},(_,i)=>({id:'w'+i,user_book_id:'b',surface:i===0?'コーヒー':'語'+i,reading:i===0?'コーヒー':'かな',meaning:'meaning',study_identity_key:null,meaning_choice_index:0,hidden:false,flashcard_hidden:false,created_at:'2020-01-01',target_language_code:'ja'}));
 const claimRows=Array.from({length:claims},(_,i)=>({id:'c'+i,user_id:'u',surface:i===0?'コーヒー':'語'+i,reading:i===0?'コーヒー':'かな',meaning:'meaning',study_identity_key:i===0?'コーヒー||こーひー':`語${i}||かな`,claimed_color:'green',created_at:'2020-01-01',updated_at:'2020-01-01'}));
 return {calls,client:{auth:{async getUser(){authCalls++;return {data:{user:{id:switched&&authCalls>1?'other':'u'}},error:null};}},async rpc(name,args){calls.push({table:name});assert.equal(name,'get_word_sky_pool');assert.equal(args.p_limit,180);return {data:poolFailure?null:[{study_identity_key:'reference||ご',surface:'語',reading:'ご',meaning:'word'}],error:poolFailure?Error('pool'):null};},from(table){let start=0,end=Infinity;const filters=[];calls.push({table});const q={select(){return q},eq(k,v){filters.push([k,v]);return q},in(){return q},not(){return q},or(){return q},order(){return q},limit(n){end=n-1;return q},range(a,b){start=a;end=b;return q},maybeSingle(){return q},then(resolve,reject){
 for(const [key,value] of filters)if(key==='user_id'||key==='id')assert.equal(value,'u');
 let data=table==='profiles'?profile:table==='user_learning_settings'?{show_ability_check_reminder:enabled}:table==='user_books'?[{id:'b',user_id:'u'}]:table==='personal_user_book_words'?wordRows:table==='user_library_word_claims'?claimRows:table==='personally_hidden_study_identities'?hiddenKeys.map(study_identity_key=>({study_identity_key})):table==='user_library_word_summaries'?summaryRows:table==='user_library_word_progress'?skyProgress:[];
 const count=Array.isArray(data)?data.length:null;if(Array.isArray(data))data=data.slice(start,end+1);
 return Promise.resolve({data,count,error:(settingsFailure&&table==='user_learning_settings')||(queryFailure&&table==='personal_user_book_words')||(visibilityFailure&&table==='personally_hidden_study_identities')?Error('synthetic'):null}).then(resolve,reject);
 }};return q;}}};
}
test('actual loader respects disabled preference and failed preference lookup before loading activities',async()=>{
 for(const opts of [{enabled:false},{settingsFailure:true}]){const f=fixture(opts);assert.equal(await loadDailyLibraryReminder(f.client,'u',memory()),null);assert.ok(!f.calls.some(c=>c.table==='get_word_sky_pool'));}
});
test('free/expired get no reminder; trial gets Word Sky, paid/staff get independent Ability Check readiness',async()=>{
 for(const [opts,expected] of [[{access:'free'},null],[{access:'expired'},null],[{access:'trial'},'word_sky'],[{},'ability_check'],[{role:'teacher'},'ability_check'],[{role:'admin'},'ability_check']]){
  const f=fixture(opts),loaded=await loadDailyLibraryReminder(f.client,'u',memory());
  const result=loaded?select(input({...loaded,date:new Date('2026-10-27T03:00:00Z')})):null;
  assert.equal(result,expected,JSON.stringify(opts));
 }
});
test('actual loader retains canonical 99 coffee overlap, due 9/10 boundaries, and safe unknown/error states',async()=>{
 for(const [words,claims,expected] of [[99,10,'word_sky'],[100,10,'ability_check'],[100,9,'word_sky']]){
  const f=fixture({words,claims}),loaded=await loadDailyLibraryReminder(f.client,'u',memory());
  assert.equal(loaded.readiness.eligibleIdentityCount,words);assert.equal(loaded.readiness.dueCardCount,claims);
  assert.equal(select(input({...loaded,date:new Date('2026-10-27T03:00:00Z')})),expected);
 }
 const f=fixture({queryFailure:true}),loaded=await loadDailyLibraryReminder(f.client,'u',memory());
 assert.equal(loaded.readiness.status,'unknown');assert.equal(select(input({...loaded})),null);
 assert.equal(await loadDailyLibraryReminder(fixture({switched:true}).client,'u',memory()),null);
 const poolFailed=await loadDailyLibraryReminder(fixture({poolFailure:true}).client,'u',memory());
 assert.equal(select(input({...poolFailed})),'ability_check');
});
test('Library has exactly one new invitation path and no legacy reminder loader or activity-completion dismissal',()=>{
 const page=fs.readFileSync('app/(protected)/users/[username]/books/page.tsx','utf8');
 assert.equal((page.match(/<DailyLibraryReminder\b/g)||[]).length,1);
 assert.match(page,/isViewingOwnLibrary && !libraryBooksLoading/);
 assert.doesNotMatch(page,/loadAbilityCheckReminder|<AbilityCheckReminderBanner|unlockAbilityCheckReminder/);
 const component=fs.readFileSync('app/(protected)/users/[username]/books/components/DailyLibraryReminder.tsx','utf8');
 assert.match(component,/setHidden\(\{ ownerId: props.ownerId, day \}\)/);
 assert.match(component,/stale = true/);assert.match(component,/session\?\.user.id/);
 assert.doesNotMatch(component,/ability-check-completed-date|ability-check-reminder-hidden-date/);
});

test('Word Sky availability excludes personally hidden and completed-color reading identities; failures fail closed',async()=>{
 for(const options of [{hiddenKeys:['reference||ご']},{summaryRows:[{id:'summary',study_identity_key:'reference||ご',total_encounter_count:3}],skyProgress:[{id:'progress',study_identity_key:'reference||ご',reading_gate_status:'passed',meaning_gate_status:'not_started',mastered:false}]},{visibilityFailure:true}]){
  const result=await loadDailyLibraryReminder(fixture({...options,access:'trial'}).client,'u',memory());
  assert.equal(result.wordSkyAvailable,false,JSON.stringify(options));assert.equal(select(input({...result})),null);
 }
});

test('all five appearance palettes keep invitation text and action contrast readable under both treatments',()=>{
 const {APPEARANCE_PALETTES}=load('lib/appearance/palettes.ts');
 const luminance=hex=>{const parts=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return parts[0]*0.2126+parts[1]*0.7152+parts[2]*0.0722;};
 const ratio=(a,b)=>{const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+0.05)/(values[1]+0.05);};
 for(const palette of Object.values(APPEARANCE_PALETTES))for(const treatment of ['solid','neutralTouches']){
  assert.ok(ratio(palette.text,palette.surface)>=4.5,`${palette.label}/${treatment} text`);
  assert.ok(ratio(palette.mutedText,palette.surface)>=4.5,`${palette.label}/${treatment} description`);
  assert.ok(ratio(palette.text,palette.surfaceMuted)>=4.5,`${palette.label}/${treatment} hover`);
 }
 assert.ok(ratio('#ffffff','#1e293b')>=4.5);assert.ok(ratio('#ffffff','#334155')>=4.5);
});

test('teacher viewing student route never loads personal activities even while Library owner state is stale',async()=>{
 const f=fixture({role:'teacher'});
 assert.equal(await loadDailyLibraryReminder(f.client,'u',memory(),'/users/student/books'),null);
 assert.ok(!f.calls.some(call=>call.table==='get_word_sky_pool'||call.table==='personal_user_book_words'));
 const own=await loadDailyLibraryReminder(fixture({role:'teacher'}).client,'u',memory(),'/users/reader/books');
 assert.ok(own);assert.equal(own.libraryPath,'/users/reader/books');
});
