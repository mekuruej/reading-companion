import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const read = f => fs.readFileSync(f,'utf8');
const profilePath = 'app/(protected)/community/profile/';
function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if(cache.has(file)) return cache.get(file);
    const code = ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
    const exports={};cache.set(file,exports);
    new Function('require','exports','window',code)(name => {
      if(name in mocks)return mocks[name];
      if(name.startsWith('@/')||name.startsWith('.')) {
        const base = name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name);
        const target=['', '.ts','.tsx','.mjs'].map(ext=>base+ext).find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
        return load(target);
      }
      return require(name);
    },exports,mocks.window??{dispatchEvent(){}});
    return exports;
  }
  return load;
}
const load=loader();
const summary=load('lib/profile/privateReadingSummary.ts');
const {saveProfileRecords}=load('lib/profile/saveProfileRecords.ts');
const {loadPrivateReadingSummary}=load('lib/profile/loadPrivateReadingSummary.ts');
function fakeDatabase({books=[],sessions=[],profile={},reader={},failTable=null,failWriteTable=null,failPage=null}={}) {
  let owner='reader-a';const writes=[],queries=[],listeners=new Set();
  const db={writes,queries,profile,reader,auth:{getUser:async()=>({data:{user:owner?{id:owner}:null},error:null}),onAuthStateChange(fn){listeners.add(fn);return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}}}},switch(id,event=id?'SIGNED_IN':'SIGNED_OUT'){owner=id;for(const f of listeners)f(event,id?{user:{id}}:null);},from(table){
    const q={table,filters:[],opts:{},from:0,to:Infinity,select(fields,opts={}){q.fields=fields;q.opts=opts;return q;},eq(k,v){q.filters.push([k,v]);return q;},neq(){return q;},is(){return q;},limit(){return q;},not(){return q;},or(...args){(q.ors??=[]).push(args);return q;},in(k,v){q.modes=v;return q;},gt(k,v){q.positive=true;return q;},gte(k,v){q.minimum=v;return q;},lte(k,v){q.maximum=v;return q;},order(...args){q.ordering=args;return q;},range(a,b){q.from=a;q.to=b;return q;},returns(){return q;},maybeSingle(){q.single=true;return q;},upsert(record){q.write=record;return q;},then(resolve,reject){return Promise.resolve().then(()=>{
      queries.push(q);
      if(q.write){writes.push([table,{...q.write}]);if(failTable===table||failWriteTable===table)return {error:{message:table==='profiles'?'duplicate username':'synthetic reader failure'}};Object.assign(table==='profiles'?profile:reader,q.write);return {error:null};}
      if(failTable===table||failPage===q.from)return {data:null,count:null,error:{message:'synthetic query failure'}};
      if(q.single)return {data:table==='profiles'?profile:reader,error:null};
      const rows=table==='user_books'?books:sessions;
      let selected=rows.filter(r=>!q.filters.some(([key,value])=>key in r&&r[key]!==value));
      if(q.modes)selected=selected.filter(r=>q.modes.includes(r.session_mode)&&!r.is_filler&&!r.is_teacher_prep&&r.personal_tracking_status!=='not_tracking');
      if(q.positive)selected=selected.filter(r=>r.minutes_read>0);
      for(const [key,v] of q.filters)if(key==='read_on')selected=selected.filter(r=>r.read_on===v);
      if(q.minimum)selected=selected.filter(r=>r.read_on>=q.minimum);
      if(q.maximum)selected=selected.filter(r=>r.read_on<=q.maximum);
      return {data:q.opts.head?null:selected.slice(q.from,q.to+1),count:selected.length,error:null};
    }).then(resolve,reject);}};return q;
  }};return db;
}
const account={display_name:'Reader',username:'DEMO1',native_language:'English',japanese_learning_enabled:true,level:'Level 6'};
const reader={bio:'Hello',favorite_genres:['Mystery'],public_name_choice:'username',jlpt_level_public:null};
function mount(file,db,props={},extraMocks={}) {
  const hooks=[];let index=0,pending=[],tree;
  const react={
    useState(initial){const i=index++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],v=>{hooks[i]=typeof v==='function'?v(hooks[i]):v;}];},
    useRef(initial){const i=index++;return hooks[i]??=( {current:initial} );},
    useCallback(fn,deps){const i=index++;const old=hooks[i];if(!old||deps.some((d,j)=>d!==old.deps[j]))hooks[i]={value:fn,deps};return hooks[i].value;},
    useEffect(fn,deps){const i=index++;const old=hooks[i];if(!old||deps.some((d,j)=>d!==old.deps[j])){old?.cleanup?.();hooks[i]={deps};pending.push(()=>{hooks[i].cleanup=fn();});}},
  };
  react.useMemo=(fn,deps)=>react.useCallback(fn,deps)();
  const l=loader({react,'@/lib/supabaseClient':{supabase:db},window:{dispatchEvent(){}},...extraMocks});const mod=l(file);const Component=mod.default??mod.useProfileOwner;
  const render=()=>{index=0;tree=Component(props);pending.splice(0).forEach(f=>f());return tree;};
  const h={render,get tree(){return tree;},async flush(){render();await new Promise(setImmediate);render();await new Promise(setImmediate);render();},unmount(){for(const h of hooks)h?.cleanup?.();},find(name){return walk(tree).find(n=>n.type?.name===name);}};
  render();return h;
}
function walk(n){if(Array.isArray(n))return n.flatMap(walk);if(!n||typeof n!=='object')return [];return [n,...walk(n.props?.children)];}

test('recovered summary preserves tracking resolution and excludes preparation and teaching-only records',()=>{
 assert.deepEqual(summary.getProfileBookCounts([{status:'reading'},{finished_at:'2026-10-01'},{personal_tracking_status:'not_tracking',status:'reading'},{is_teacher_prep:true,status:'finished'},{personal_tracking_status:'dnf'},{personal_tracking_status:'reading',finished_at:'2026-10-01'}]),{currentlyReading:2,finished:1});
 assert.deepEqual(summary.getProfileActivityDateBounds(new Date('2026-10-31T15:30:00Z')),{today:'2026-11-01',monthStart:'2026-11-01'});
 for(const session_mode of ['fluid','curiosity','listening'])assert.equal(summary.isProfileReadingActivitySession({session_mode}),true);
 for(const session_mode of ['flashcards','follow_along','lesson',null])assert.equal(summary.isProfileReadingActivitySession({session_mode}),false);
 assert.equal(summary.isProfileTimedReadingSession({session_mode:'fluid',minutes_read:0}),false);
 assert.equal(summary.isProfileReadingActivitySession({session_mode:'fluid',is_filler:true}),false);
});
test('complete activity load spans >1000 books and counts filtered >1000 sessions without row downloads',async()=>{
 const books=Array.from({length:1237},(_,i)=>({id:String(i),status:i<1200?'reading':'finished'}));
 const sessions=Array.from({length:1501},(_,i)=>({id:String(i),session_mode:'fluid',read_on:'2026-11-01',minutes_read:5}));
 sessions.push({session_mode:'listening',read_on:'2026-11-01',minutes_read:10},{session_mode:'fluid',read_on:'2026-11-01',minutes_read:0},{session_mode:'flashcards',read_on:'2026-11-01',minutes_read:20},{session_mode:'fluid',read_on:'2026-11-01',minutes_read:20,is_filler:true},{session_mode:'fluid',read_on:'2026-11-01',minutes_read:20,is_teacher_prep:true},{session_mode:'fluid',read_on:'2026-11-01',minutes_read:20,personal_tracking_status:'not_tracking'});
 const db=fakeDatabase({books,sessions});const result=await loadPrivateReadingSummary(db,'reader-a',new Date('2026-10-31T15:30Z'));
 assert.deepEqual(result,{readToday:true,currentlyReading:1200,booksFinished:37,sessionsWithTimeLoggedThisMonth:1502});
 assert.deepEqual(db.queries.filter(q=>q.table==='user_books').map(q=>q.from),[0,500,1000]);
 assert.ok(db.queries.every(q=>q.filters.some(([k,v])=>['user_id','user_books.user_id'].includes(k)&&v==='reader-a')));
 assert.ok(db.queries.filter(q=>q.table==='user_book_reading_sessions').every(q=>q.opts.head&&q.opts.count==='exact'&&q.ors.length===3));
});
test('empty data is zero; failed/incomplete pages reject instead of showing truncated or zero totals',async()=>{
 assert.deepEqual(await loadPrivateReadingSummary(fakeDatabase(),'reader-a'),{readToday:false,currentlyReading:0,booksFinished:0,sessionsWithTimeLoggedThisMonth:0});
 await assert.rejects(loadPrivateReadingSummary(fakeDatabase({failTable:'user_book_reading_sessions'}),'reader-a'));
 await assert.rejects(loadPrivateReadingSummary(fakeDatabase({books:Array.from({length:1200},(_,i)=>({id:String(i)})),failPage:500}),'reader-a'));
});
test('two successful writes are owner-scoped and confirmation precedes reader-profile completion',async()=>{
 const db=fakeDatabase();let notifications=0;
 await saveProfileRecords(db,'reader-a',account,reader,()=>true,()=>{notifications++;assert.equal(db.writes.length,1);});
 assert.equal(notifications,1);assert.equal(db.writes.length,2);assert.equal(db.writes[0][1].id,'reader-a');assert.equal(db.writes[1][1].user_id,'reader-a');assert.equal(db.reader.jlpt_level_public,null);
});
test('duplicate username stops before reader save; a failed second write retains confirmed identity and supports retry',async()=>{
 const bad=fakeDatabase({failTable:'profiles'});let notifications=0;
 await assert.rejects(saveProfileRecords(bad,'reader-a',account,reader,()=>true,()=>notifications++),/duplicate username/);assert.equal(notifications,0);assert.equal(bad.writes.length,1);
 const partial=fakeDatabase({failTable:'user_public_profile'});
 await assert.rejects(saveProfileRecords(partial,'reader-a',account,reader,()=>true,()=>notifications++),/account details were saved.*Cancel does not undo/s);
 assert.equal(notifications,1);assert.equal(partial.profile.username,'DEMO1');
 const retry=fakeDatabase({profile:partial.profile});await saveProfileRecords(retry,'reader-a',account,reader,()=>true,()=>{});assert.equal(retry.reader.bio,'Hello');
});
test('identity switch blocks the old draft before saving and between writes',async()=>{
 const before=fakeDatabase();before.switch('reader-b');await assert.rejects(saveProfileRecords(before,'reader-a',account,reader,()=>true,()=>{}),/account changed/);assert.equal(before.writes.length,0);
 const between=fakeDatabase();await assert.rejects(saveProfileRecords(between,'reader-a',account,reader,()=>true,()=>between.switch('reader-b')),/account details were saved/);assert.equal(between.writes.length,1);
 const stale=fakeDatabase();await assert.rejects(saveProfileRecords(stale,'reader-a',account,reader,()=>false,()=>{}));assert.equal(stale.writes.length,0);
});
test('inline editor retains legacy usernames, custom languages, optional values and reader-profile controls',async()=>{
 const db=fakeDatabase({profile:{...account,native_language:'Custom language'},reader:{...reader,jlpt_level_public:'Level 8'}});
 let saved=0;const h=mount(profilePath+'ProfileEditor.tsx',db,{ownerId:'reader-a',isCurrentOwner:()=>true,onSaved:()=>saved++,onCancel(){}});await h.flush();
 const core=h.find('ProfileSettingsCoreCard');assert.equal(core.props.nativeLanguageChoice,'Other');assert.equal(core.props.customNativeLanguage,'Custom language');
 const pub=h.find('ProfileSettingsPublicCard');assert.equal(pub.props.publicNameChoice,'username');assert.equal(pub.props.publicLevel,'Level 8');
 core.props.onJapaneseLearningEnabledChange(false);await h.flush();await h.find('ProfileSettingsSaveBar').props.onSave();await h.flush();
 assert.equal(saved,1);assert.equal(db.profile.username,'DEMO1');assert.equal(db.profile.level,'Level 6');assert.equal(db.reader.jlpt_level_public,'Level 8');assert.equal(db.profile.native_language,'Custom language');
 assert.equal('level' in db.writes[0][1],false);assert.equal('jlpt_level_public' in db.writes[1][1],false);
});
test('Cancel does not save; second-write error keeps remaining draft and re-enables Cancel',async()=>{
 const db=fakeDatabase({profile:{...account},reader:{...reader},failWriteTable:'user_public_profile'});let cancelled=0,saved=0;
 const h=mount(profilePath+'ProfileEditor.tsx',db,{ownerId:'reader-a',isCurrentOwner:()=>true,onSaved:()=>saved++,onCancel:()=>cancelled++});await h.flush();
 h.find('ProfileSettingsCoreCard').props.onDisplayNameChange('Changed');h.find('ProfileSettingsPublicCard').props.onBioChange('Unsaved draft');await h.flush();
 await h.find('ProfileSettingsSaveBar').props.onSave();await h.flush();
 assert.equal(saved,0);assert.equal(db.profile.display_name,'Changed');assert.equal(h.find('ProfileSettingsPublicCard').props.bio,'Unsaved draft');assert.equal(h.find('ProfileSettingsSaveBar').props.saving,false);
 h.find('ProfileSettingsSaveBar').props.onCancel();assert.equal(cancelled,1);assert.equal(db.writes.length,2);
});
test('failed editor loads disable editing instead of writing empty defaults',async()=>{
 const db=fakeDatabase({failTable:'user_public_profile'});const h=mount(profilePath+'ProfileEditor.tsx',db,{ownerId:'reader-a',isCurrentOwner:()=>true,onSaved(){},onCancel(){}});await h.flush();assert.equal(h.find('ProfileSettingsSaveBar'),undefined);assert.equal(db.writes.length,0);
});
test('identity guard preserves same-user refresh, rejects switched owners and invalidates unmounts',async()=>{
 const db=fakeDatabase();const h=mount('lib/profile/useProfileOwner.ts',db);await h.flush();assert.equal(h.tree.ownerId,'reader-a');
 const guard=h.tree.isCurrentOwner;db.switch('reader-a','TOKEN_REFRESHED');await h.flush();assert.equal(h.tree.isCurrentOwner,guard);assert.equal(guard('reader-a'),true);
 db.switch('reader-b');assert.equal(guard('reader-a'),false);await h.flush();assert.equal(h.tree.ownerId,'reader-b');db.switch(null);assert.equal(guard('reader-b'),false);await h.flush();assert.equal(h.tree.ownerId,null);h.unmount();assert.equal(guard('reader-b'),false);
});
test('late getUser and editor requests cannot resurrect a previous identity or overwrite newer data',async()=>{
 const db=fakeDatabase();let resolve;db.auth.getUser=()=>new Promise(r=>{resolve=r;});const h=mount('lib/profile/useProfileOwner.ts',db);
 db.switch('reader-b');resolve({data:{user:{id:'reader-a'}},error:null});await h.flush();assert.equal(h.tree.ownerId,'reader-b');h.unmount();
});
test('feature preservation, accurate wording, route compatibility and appearance separation remain explicit',()=>{
 const page=read(profilePath+'page.tsx'),editor=read(profilePath+'ProfileEditor.tsx'),stats=read(profilePath+'ProfileReadingStatistics.tsx'),preview=read(profilePath+'preview/page.tsx');
 for(const label of ['Read today','Currently reading','Timed sessions this month','Books finished','Back to My Library','Preview reader profile'])assert.ok(page.includes(label));
 for(const label of ['Books Read','Books Listened To','Books in Library','Pages Read (not listened to)','Time Spent','Average Curiosity Reading','Average Fluid Reading','View Detailed Reading Stats','Membership &amp; Billing','AccessLabel'])assert.ok(stats.includes(label));
 assert.match(stats,/loadAllPagedRows/);assert.match(stats,/\.order\("id", \{ ascending: true \}\)\.range\(from, to\)/);
 assert.match(page,/Appearance changes apply immediately in this browser and are not undone by Cancel\./);assert.doesNotMatch(editor,/AppearanceSettings/);
 assert.doesNotMatch(page+editor,/ProfileFavoriteBooks|is_favorite|not a public profile page/);
 assert.match(page,/href="\/books"/);assert.match(page,/router\.replace\("\/community\/profile", \{ scroll: false \}\)/);
 assert.match(read(profilePath+'settings/page.tsx'),/redirect\("\/community\/profile\?edit=1"\)/);
 assert.match(preview,/findMekuruReadingLevel\(publicProfile\?\.jlpt_level_public\)/);assert.doesNotMatch(preview,/findMekuruReadingLevel\(profile\?\.level\)|fallbackLevelLabel=\{displayValue\(profile\?\.level/);
});

test('Production page/time/pace calculations remain unchanged with a complete >1000-session history',async()=>{
 const sessions=Array.from({length:1237},(_,i)=>({id:String(i),user_book_id:'reading',start_page:i,end_page:i+1,minutes_read:2,session_mode:'fluid',user_books:{books:{book_type:'novel',language_code:'ja'}}}));
 sessions.push({id:'audio',user_book_id:'audio-book',start_page:0,end_page:30,minutes_read:25,session_mode:'listening'}, {id:'filler',user_book_id:'reading',start_page:0,end_page:999,minutes_read:999,session_mode:'fluid',is_filler:true});
 const db=fakeDatabase({books:[{id:'book'}],sessions});
 const h=mount(profilePath+'ProfileReadingStatistics.tsx',db,{ownerId:'reader-a',profile:{...account,app_access_type:'reading_access'},isCurrentOwner:()=>true});await h.flush();
 const cards=walk(h.tree).filter(n=>n.type?.name==='HighlightCard');
 assert.equal(cards.find(n=>n.props.label==='Pages Read (not listened to)').props.value,'1,237');
 assert.equal(cards.find(n=>n.props.label==='Books Listened To').props.value,'1');
 assert.equal(cards.find(n=>n.props.label==='Time Spent').props.value,'41h 39m');
 const pace=walk(h.tree).find(n=>n.type?.name==='PaceAverageCard'&&n.props.label==='Average Fluid Reading');assert.equal(pace.props.value,'2.0 min/page');assert.equal(pace.props.pages,1237);
 const queries=db.queries.filter(q=>q.table==='user_book_reading_sessions');assert.deepEqual(queries.map(q=>q.from),[0,500,1000]);assert.ok(queries.every(q=>q.opts.count==='exact'&&q.ordering[0]==='id'));
 h.unmount();
});
test('pace rules retain Japanese/default-language eligibility and reject listening, zero pages and zero time',()=>{
 const stats=loader({'@/lib/supabaseClient':{supabase:{}}})(profilePath+'ProfileReadingStatistics.tsx');
 const row=(mode,language,start,end,minutes)=>({session_mode:mode,start_page:start,end_page:end,minutes_read:minutes,user_books:{books:{language_code:language,book_type:'novel'}}});
 assert.equal(stats.sessionPages(row('fluid','ja',5,8,3)),3);assert.equal(stats.sessionPages(row('fluid','ja',8,5,3)),0);
 const p=stats.buildPaceByBookType([row('curiosity','ja',0,10,20),row('fluid',null,0,5,5),row('fluid','en',0,99,900),row('listening','ja',0,99,900),row('fluid','ja',0,0,10),row('fluid','ja',0,10,0)]);
 assert.equal(p.length,1);assert.equal(p[0].curiosityMinPerPage,2);assert.equal(p[0].fluidMinPerPage,1);
});
test('failed statistics show unavailable placeholders while access information remains available',async()=>{
 const db=fakeDatabase({failTable:'user_book_reading_sessions'});const h=mount(profilePath+'ProfileReadingStatistics.tsx',db,{ownerId:'reader-a',profile:{...account},isCurrentOwner:()=>true});await h.flush();
 const cards=walk(h.tree).filter(n=>n.type?.name==='HighlightCard');assert.ok(cards.every(n=>n.props.value==='—'));assert.ok(h.find('AccessLabel'));assert.ok(walk(h.tree).some(n=>n.props?.role==='alert'));h.unmount();
});
test('late statistics cannot publish after an identity change',async()=>{
 const db=fakeDatabase();let current=true;
 const h=mount(profilePath+'ProfileReadingStatistics.tsx',db,{ownerId:'reader-a',profile:{...account},isCurrentOwner:()=>current});current=false;await h.flush();
 assert.ok(walk(h.tree).filter(n=>n.type?.name==='HighlightCard').every(n=>n.props.value==='—'));h.unmount();
});
test('same-user refresh does not erase editor drafts; public-level hiding and genre normalization save correctly',async()=>{
 const db=fakeDatabase({profile:{...account},reader:{...reader}});const h=mount(profilePath+'ProfileEditor.tsx',db,{ownerId:'reader-a',isCurrentOwner:()=>true,onSaved(){},onCancel(){}});await h.flush();
 let card=h.find('ProfileSettingsPublicCard');card.props.onBioChange('  Edited bio  ');card.props.onPublicNameChoiceChange('display_name');card.props.onPublicLevelChange('None');card.props.onFavoriteGenreInputChange(' mystery, Science, science ');await h.flush();h.find('ProfileSettingsPublicCard').props.onAddFavoriteGenres();db.switch('reader-a','TOKEN_REFRESHED');await h.flush();
 assert.equal(h.find('ProfileSettingsPublicCard').props.bio,'  Edited bio  ');await h.find('ProfileSettingsSaveBar').props.onSave();await h.flush();
 assert.equal(db.reader.bio,'Edited bio');assert.deepEqual(db.reader.favorite_genres,['Mystery','Science']);assert.equal(db.reader.jlpt_level_public,null);assert.equal(db.reader.public_name_choice,'display_name');
});
test('Cancel before Save performs no writes and public preview has no private-level fallback',async()=>{
 const db=fakeDatabase({profile:{...account},reader:{...reader}});let cancelled=0;const h=mount(profilePath+'ProfileEditor.tsx',db,{ownerId:'reader-a',isCurrentOwner:()=>true,onSaved(){},onCancel:()=>cancelled++});await h.flush();h.find('ProfileSettingsCoreCard').props.onDisplayNameChange('Unsaved');await h.flush();h.find('ProfileSettingsSaveBar').props.onCancel();assert.equal(cancelled,1);assert.equal(db.writes.length,0);h.unmount();
 const source=read(profilePath+'preview/page.tsx');assert.match(source,/fallbackLevelLabel=\{displayValue\(publicProfile\?\.jlpt_level_public, "Hidden"\)\}/);
});

test('an account switch during an in-flight account write cannot publish success or start the reader write',async()=>{
 const db=fakeDatabase();let complete,current=true,started=false;
 const original=db.from;
 db.from=function(table){const q=original.call(db,table);if(table==='profiles')q.upsert=fields=>{started=true;db.writes.push([table,fields]);return new Promise(r=>{complete=r;});};return q;};
 let notified=false;const save=saveProfileRecords(db,'reader-a',account,reader,()=>current,()=>notified=true);
 await new Promise(setImmediate);assert.equal(started,true);current=false;complete({error:null});await assert.rejects(save,/account changed/);
 assert.equal(notified,false);assert.equal(db.writes.length,1);assert.equal(db.writes[0][1].id,'reader-a');
});
test('late editor authentication completion after unmount cannot load or publish a draft',async()=>{
 const db=fakeDatabase();let finish;db.auth.getUser=()=>new Promise(r=>{finish=r;});
 const h=mount(profilePath+'ProfileEditor.tsx',db,{ownerId:'reader-a',isCurrentOwner:()=>true,onSaved(){},onCancel(){}});h.unmount();finish({data:{user:{id:'reader-a'}},error:null});await h.flush();assert.equal(db.queries.length,0);assert.equal(h.find('ProfileSettingsSaveBar'),undefined);
});

test('preview renders only the saved public Japanese level, including hidden and selected values',async()=>{
 for(const publicLevel of [null,'Level 8']){
  const db=fakeDatabase({profile:{...account},reader:{...reader,jlpt_level_public:publicLevel}});
  const h=mount(profilePath+'preview/page.tsx',db,{}, {'@/lib/profile/useProfileOwner':{useProfileOwner:()=>({ownerId:'reader-a',isCurrentOwner:()=>true})},'@/lib/libraryStudyTotals':{fetchLibraryStudyColorTotals:async()=>({green:1,blue:2,purple:3})}});await h.flush();
  const grid=h.find('ProfilePreviewStatsGrid');assert.equal(grid.props.readingLevel?.value??null,publicLevel);assert.equal(grid.props.fallbackLevelLabel,publicLevel??'Hidden');assert.equal(grid.props.loading,false);h.unmount();
 }
});
test('preview failed color lookup is unavailable rather than a false zero',async t=>{
 t.mock.method(console,'error',()=>{});
 const db=fakeDatabase({profile:{...account},reader:{...reader}});const h=mount(profilePath+'preview/page.tsx',db,{}, {'@/lib/profile/useProfileOwner':{useProfileOwner:()=>({ownerId:'reader-a',isCurrentOwner:()=>true})},'@/lib/libraryStudyTotals':{fetchLibraryStudyColorTotals:async()=>{throw Error('synthetic unavailable');}}});await h.flush();assert.ok(h.find('ProfilePreviewAbilityColors').props.items.every(item=>item.value==='—'));h.unmount();
});
test('late preview requests cannot publish after the owner changes',async()=>{
 const db=fakeDatabase({profile:{...account},reader:{...reader}});let current=true;
 const h=mount(profilePath+'preview/page.tsx',db,{}, {'@/lib/profile/useProfileOwner':{useProfileOwner:()=>({ownerId:'reader-a',isCurrentOwner:()=>current})},'@/lib/libraryStudyTotals':{fetchLibraryStudyColorTotals:async()=>({green:1,blue:2,purple:3})}});current=false;await h.flush();assert.equal(h.find('ProfilePreviewStatsGrid').props.loading,true);assert.equal(h.find('ProfilePreviewStatsGrid').props.readingLevel,null);h.unmount();
});
