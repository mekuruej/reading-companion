import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function loadTsModule(file){const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','exports',code)(name=>{if(name.startsWith('.')||name.startsWith('@/')){const base=name.startsWith('@/')?name.slice(2):path.resolve(path.dirname(file),name);return loadTsModule(['.ts','.tsx'].map(ext=>base+ext).find(fs.existsSync));}return require(name)},exports);return exports;}
const {searchOwnedFinalizedVocabulary,previousSavedLocation,OCCURRENCE_PAGE_SIZE,MAX_OCCURRENCE_PAGES}=loadTsModule('lib/personalVocabularySearchServer.ts');
const {searchPersonalVocabulary,personalVocabularyEntryKey}=loadTsModule('lib/personalVocabularySearch.ts');
const BOOK='11111111-1111-4111-8111-111111111111',OTHER_BOOK='22222222-2222-4222-8222-222222222222';
const row=(overrides={})=>({id:'word-a',surface:'還元',reading:'かんげん',meaning:'restoration; return',alternative_surface:null,created_at:'2026-01-01T00:00:00Z',user_book_id:BOOK,user_books:{user_id:'owner-a'},finalized:true,position_unit:'page',position_value:34,...overrides});
function createSearchClient(rows,{fail=false,incomplete=false}={}){
 const queries=[];const client={from(table){assert.equal(table,'finalized_user_book_words');const q={filters:[],ordering:[],options:{},start:0,end:Infinity};queries.push(q);const b={select(fields,options={}){q.fields=fields;q.options=options;return b},eq(k,v){q.filters.push([k,v]);return b},ilike(k,v){q.pattern=[k,v];return b},order(k,v){q.ordering.push([k,v]);return b},limit(n){q.limit=n;return b},range(a,z){q.start=a;q.end=z;q.history=true;return b},then(resolve,reject){let selected=rows.filter(r=>r.finalized!==false&&q.filters.every(([k,v])=>k==='user_books.user_id'?r.user_books.user_id===v:r[k]===v));if(q.pattern){const [field,pattern]=q.pattern;const term=pattern.slice(1,-1).replace(/\\([\\%_])/g,'$1').toLowerCase();selected=selected.filter(r=>String(r[field]??'').toLowerCase().includes(term));}selected.sort((a,b)=>{for(const [k,o]of q.ordering){const value=String(a[k]??'').localeCompare(String(b[k]??''));if(value)return o.ascending?value:-value;}return 0});const count=selected.length;let data=selected.slice(q.start,Math.min(q.end+1,q.limit??Infinity));if(incomplete&&q.history)data=data.slice(1);return Promise.resolve({data:fail?null:data,count,error:fail?Error('synthetic query failure'):null}).then(resolve,reject)}};return b}};return {client,queries};
}
const search=(db,q='還',locations=false)=>searchOwnedFinalizedVocabulary(db.client,'owner-a',BOOK,q,locations);
test('same-book finalized owner search includes hidden entries, excludes other books/owners and unfinished lessons',async()=>{
 const db=createSearchClient([row({hidden:true}),row({id:'other-book',user_book_id:OTHER_BOOK}),row({id:'foreign',user_books:{user_id:'other-owner'}}),row({id:'draft',finalized:false,meaning:'unfinished'})]);const result=await search(db,'還',true);assert.equal(result.length,1);assert.equal(result[0].meaning,'restoration; return');assert.ok(db.queries.every(q=>q.filters.some(([k,v])=>k==='user_book_id'&&v===BOOK)&&q.filters.some(([k,v])=>k==='user_books.user_id'&&v==='owner-a')));assert.ok(db.queries.every(q=>!q.filters.some(([k])=>k.includes('hidden'))));
 const sql=fs.readFileSync('sql/20261012_live_lesson_finalized_visibility.sql','utf8');assert.match(sql,/session\.status <> 'completed'/);assert.match(sql,/where public\.is_finalized_book_word\(word\.id\)/);
});
test('Japanese partial/exact reading and alternate spelling searches, wildcard escaping and empty results',async()=>{
 const db=createSearchClient([row({surface:'還元_%\\',alternative_surface:'還原'})]);for(const query of ['還','還元_%\\','かんげん','還原'])assert.equal((await search(db,query)).length,1);assert.deepEqual(await search(db,'absent'),[]);assert.ok(db.queries.some(q=>q.pattern?.[1]==='%還元\\_\\%\\\\%'));
});
test('content deduplication preserves meanings and stable recent-first/ID ordering, with a 20-result cap',async()=>{
 const rows=[row({id:'z',meaning:'second'}),row({id:'b',meaning:'first'}),row({id:'a',meaning:'first'})];const db=createSearchClient(rows);assert.deepEqual((await search(db)).map(r=>r.meaning),['first','second']);assert.ok(db.queries.every(q=>q.limit===20));const many=createSearchClient(Array.from({length:30},(_,i)=>row({id:String(i).padStart(3,'0'),meaning:'meaning '+i})));assert.equal((await search(many)).length,20);
});
test('oldest timestamp wins even when saved later in physical reading order and beyond capped recent matches',async()=>{
 const rows=Array.from({length:35},(_,i)=>row({id:'r'+String(i).padStart(3,'0'),created_at:new Date(Date.UTC(2026,0,i+1)).toISOString(),position_value:i===0?90:34}));const result=await search(createSearchClient(rows),'還',true);assert.equal(result[0].previousLocation,'Previously saved on page 90');
});
test('oldest matching normalized content, deterministic timestamp ties, and distinct-meaning histories',async()=>{
 const rows=[row({id:'b',position_value:99}),row({id:'a',surface:' 還元 ',reading:' かんげん ',position_value:12}),row({id:'c',meaning:'different meaning',position_value:45})];const result=await search(createSearchClient(rows),'還',true);assert.equal(result.find(r=>r.meaning==='restoration; return').previousLocation,'Previously saved on page 12');assert.equal(result.find(r=>r.meaning==='different meaning').previousLocation,'Previously saved on page 45');
});
for(const [name,record,expected] of [
 ['canonical page',{position_unit:'page',position_value:34,page_number:9},'Previously saved on page 34'],
 ['legacy page',{position_unit:null,position_value:null,page_number:34},'Previously saved on page 34'],
 ['Kindle',{position_unit:'kindle_location',position_value:1234,page_number:9},'Previously saved at Kindle location 1234'],
 ['percent',{position_unit:'percent',position_value:12.5},'Previously saved at 12.5%'],
 ['legacy percent',{position_unit:null,position_value:null,percent_location:25},'Previously saved at 25%'],
 ['chapter only',{position_unit:null,position_value:null,chapter_number:2,chapter_name:'Return'},'Previously saved in Chapter 2: Return'],
 ['unknown',{position_unit:null,position_value:null,page_order:34},null],
 ['invalid unit',{position_unit:'unknown',position_value:34,page_number:34},null],
 ['unknown canonical',{position_unit:'page',position_value:null,page_number:34},null],
])test(`location formatting: ${name}`,()=>assert.equal(previousSavedLocation(row(record)),expected));
test('unknown oldest location never borrows the newer occurrence location',async()=>{
 const result=await search(createSearchClient([row({position_unit:null,position_value:null}),row({id:'new',created_at:'2026-02-01',position_value:34})]),'還',true);assert.equal(result[0].previousLocation,null);
});
test('chronological history scans beyond one page and every query remains bounded and scoped',async()=>{
 const rows=Array.from({length:550},(_,i)=>row({id:String(i),surface:'unrelated',created_at:'2025-01-01'}));rows.push(row({id:'match'}));const db=createSearchClient(rows);assert.equal((await search(db,'還',true))[0].previousLocation,'Previously saved on page 34');const pages=db.queries.filter(q=>q.history);assert.equal(pages.length,2);assert.ok(pages.every(q=>q.end-q.start+1===OCCURRENCE_PAGE_SIZE));
});
test('history limit and incomplete/failed pages fail explicitly rather than guessing a location',async()=>{
 const rows=Array.from({length:MAX_OCCURRENCE_PAGES*OCCURRENCE_PAGE_SIZE},(_,i)=>row({id:String(i),surface:'unrelated',created_at:'2025-01-01'}));rows.push(row({id:'match'}));await assert.rejects(search(createSearchClient(rows),'還',true),/history limit/);await assert.rejects(search(createSearchClient([row()],{incomplete:true}),'還',true),/Incomplete/);await assert.rejects(search(createSearchClient([row()],{fail:true})),/synthetic query failure/);
});
test('Follow-Along requests no history and the API payload contains no source IDs or ownership metadata',async()=>{const db=createSearchClient([row()]);const result=await search(db);assert.equal(db.queries.length,3);assert.deepEqual(Object.keys(result[0]).sort(),['alternativeSurface','meaning','reading','surface']);});

function routeHarness({user={id:'owner-a'},authError=null,book={id:BOOK},bookError=null,search=async()=>[]}={}){const exports={},queries=[];const source=ts.transpileModule(fs.readFileSync('app/api/personal-vocabulary-search/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;new Function('require','exports','process',source)(name=>{if(name==='server-only')return {};if(name==='next/server')return {NextResponse:{json:(body,options)=>({body,...options})}};if(name==='@supabase/supabase-js')return {createClient:()=>({auth:{getUser:async()=>({data:{user},error:authError})},from(table){assert.equal(table,'user_books');const q={select(){return q},eq(k,v){queries.push([k,v]);return q},maybeSingle:async()=>({data:book,error:bookError})};return q}})};if(name==='@/lib/personalVocabularySearchServer')return {searchOwnedFinalizedVocabulary:search};throw Error(name)},exports,{env:{}});return {GET:exports.GET,queries};}
const request=(query='還',book=BOOK,token='synthetic')=>new Request(`http://fixture/api/personal-vocabulary-search?query=${encodeURIComponent(query)}&userBookId=${book}&ownerId=other&previousLocation=1`,{headers:token?{Authorization:'Bearer '+token}:{}});
test('route rejects missing/invalid/expired sessions and invalid book IDs before searching',async()=>{
 for(const token of [null,'invalid','expired']){const {GET}=routeHarness({user:token==='synthetic'?{id:'owner-a'}:null,authError:Error('invalid')});assert.equal((await GET(request('還',BOOK,token))).status,401);}for(const id of ['', 'bad','../../other'])assert.equal((await routeHarness().GET(request('還',id))).status,400);
});
test('route verifies book ownership, ignores supplied owner and rejects other-owner/missing books identically',async()=>{
 let args;const {GET,queries}=routeHarness({search:async(...a)=>{args=a;return []}});await GET(request());assert.deepEqual(queries,[['id',BOOK],['user_id','owner-a']]);assert.deepEqual(args.slice(1),['owner-a',BOOK,'還',true]);const noBook=routeHarness({book:null});assert.equal((await noBook.GET(request())).status,404);
});
test('route handles empty/oversized queries and failures without exposing internal details',async t=>{
 assert.deepEqual((await routeHarness().GET(request('  '))).body,{data:[]});assert.equal((await routeHarness().GET(request('x'.repeat(101)))).status,400);t.mock.method(console,'error',()=>{});const response=await routeHarness({search:async()=>{throw Error('private failure')}}).GET(request());assert.equal(response.status,500);assert.equal(response.headers['Cache-Control'],'private, no-store');assert.doesNotMatch(JSON.stringify(response.body),/private failure/);
});
test('client supplies only current-book selector and bearer auth; locations are requested only for Curiosity',async()=>{const original=globalThis.fetch;const calls=[];globalThis.fetch=async(...args)=>{calls.push(args);return {ok:true,json:async()=>({data:[]})}};try{await searchPersonalVocabulary(' 還 ','synthetic',BOOK,true);await searchPersonalVocabulary('還','synthetic',BOOK);assert.match(calls[0][0],/userBookId=/);assert.match(calls[0][0],/previousLocation=1/);assert.doesNotMatch(calls[1][0],/previousLocation/);assert.equal(calls[0][1].headers.Authorization,'Bearer synthetic');assert.doesNotMatch(calls[0][0],/ownerId/);await assert.rejects(searchPersonalVocabulary('還',null,BOOK),/Sign in/);}finally{globalThis.fetch=original}});
const followSource=fs.readFileSync('app/(protected)/books/[userBookId]/readalong/page.tsx','utf8');
function functionText(source,name){const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let result;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)result=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.ok(result,name);return result;}
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const followFunctions=['makeBlankAddAfterDraft','lookupAddAfterWord','applyPersonalAddAfterEntry','applyAddAfterCandidate','openAddAfter','openEmptyPageAddWord','renderAddAfterPanel','saveAddAfterWord'];
function followHarness({dictionary=async()=>({ok:true,json:async()=>({data:[]})}),personal=async()=>[],allowed=true,session=async()=>({data:{session:{access_token:'synthetic'}}})}={}){
 const source=`let addAfterDraft=makeBlankAddAfterDraft('語'),activeAddAfterWordId='anchor';const personalLookupVersion={current:0};const newWordPosition='1',newWordUnit='page',emptyPageAddWordKey='empty',currentPage=null,activeAddPlacement='after',canSearchPersonalVocabulary=allowed;
 const setAddAfterDraft=update=>{addAfterDraft=typeof update==='function'?update(addAfterDraft):update};const setActiveAddAfterWordId=update=>{activeAddAfterWordId=typeof update==='function'?update(activeAddAfterWordId):update};const setActiveAddPlacement=()=>{},setAddPosition=()=>{};const parseWordPosition=()=>({value:1,error:null}),wordPosition=()=>({unit:'page',value:1}),wordPositionInput=()=> '1';const supabase={auth:{getSession:session}},searchPersonalVocabulary=personal,fetch=dictionary,buildJishoCandidates=x=>x;const dismissedPersonalEntries=[],setDismissedPersonalEntries=()=>{};const WordPositionField=()=>null,PersonalVocabularyResults=()=>null;const userBookId='synthetic-book',canAccessBook=true,canUseSavedWordReading=true;
 ${followFunctions.map(name=>functionText(followSource,name)).join('\n')}
 return {lookup:lookupAddAfterWord,select:applyPersonalAddAfterEntry,open:openAddAfter,openEmpty:openEmptyPageAddWord,panel:()=>renderAddAfterPanel({surface:'anchor'}),save:()=>saveAddAfterWord({surface:'anchor'}),get draft(){return addAfterDraft},get version(){return personalLookupVersion.current}};`;
 return new Function('require','exports','dictionary','personal','allowed','session',compile(source))(require,{},dictionary,personal,allowed,session);
}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const tick=()=>new Promise(setImmediate);
const personalEntry={surface:'保存語',reading:'ほぞんご',meaning:'Saved meaning',alternativeSurface:'保存詞'};
function walk(n){if(Array.isArray(n))return n.flatMap(walk);if(!n||typeof n!=='object')return [];return [n,...walk(n.props?.children)];}
for(const outcome of ['success','http-error','rejection'])test(`late dictionary ${outcome} and completion do not overwrite selected personal draft`,async()=>{
 const request=deferred(),h=followHarness({dictionary:()=>request.promise});const pending=h.lookup();await tick();h.select(personalEntry);const selected={...h.draft};
 if(outcome==='rejection')request.reject(Error('late failure'));else request.resolve({ok:outcome==='success',json:async()=>({data:[{surface:'wrong',reading:'wrong',defaultMeaning:'wrong',meaningChoices:[]}]})});
 await pending;assert.deepEqual(h.draft,selected);assert.equal(h.draft.lookupLoading,false);assert.equal(h.draft.selectedPersonalEntry,true);
});
test('personal response, error and completion cannot replace a selected entry',async()=>{
 for(const reject of [false,true]){const request=deferred(),h=followHarness({personal:()=>request.promise});await h.lookup();h.select(personalEntry);const selected={...h.draft};if(reject)request.reject(Error('late personal'));else request.resolve([{surface:'wrong'}]);await tick();assert.deepEqual(h.draft,selected);}
});
test('switching anchor, clearing input, cancel, and unmount protection invalidate obsolete lookups',async()=>{
 const request=deferred(),h=followHarness({dictionary:()=>request.promise});const pending=h.lookup();await tick();h.open({id:'new',surface:'new'},'after');request.resolve({ok:true,json:async()=>({data:[{surface:'wrong',meaningChoices:[]}]})});await pending;assert.equal(h.draft.word,'');
 for(const action of ['clear','cancel']){const request=deferred(),h=followHarness({dictionary:()=>request.promise});const pending=h.lookup();await tick();const nodes=walk(h.panel());if(action==='clear')nodes.find(n=>n.type==='input').props.onChange({target:{value:''}});else nodes.find(n=>n.type==='button'&&n.props.children==='Cancel').props.onClick();const current={...h.draft};request.reject(Error('obsolete'));await pending;assert.deepEqual(h.draft,current);}
 assert.match(followSource,/useEffect\(\(\) => \(\) => \{ personalLookupVersion\.current \+= 1; \}, \[userBookId, canSearchPersonalVocabulary\]\)/);
});
test('late auth completion cannot start obsolete searches; excluded contexts never call personal search',async()=>{
 const session=deferred();let searches=0;const h=followHarness({session:()=>session.promise,personal:async()=>{searches++;return []}});const pending=h.lookup();h.select(personalEntry);session.resolve({data:{session:{access_token:'synthetic'}}});await pending;assert.equal(searches,0);assert.equal(h.draft.word,personalEntry.surface);
 const excluded=followHarness({allowed:false,personal:async()=>{throw Error('must not search')}});await excluded.lookup();assert.deepEqual(excluded.draft.personalEntries,[]);
 assert.match(followSource,/ownsBook && !searchParams\.has\("studentId"\) && !searchParams\.has\("sourceUserBookId"\)/);
});


test('Follow-Along existing Save validation rejects missing reading or meaning before any write',async()=>{
 for(const missing of ['reading','meaning']){const h=followHarness();h.select({...personalEntry,[missing]:''});await h.save();assert.equal(h.draft.message,'Add the word, reading, and meaning before saving.');assert.equal(h.draft.saving,false);}
});

const Results=loadTsModule('components/vocabulary/PersonalVocabularyResults.tsx').default;
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const entryA={surface:'還元',reading:'かんげん',meaning:'restoration',alternativeSurface:'還原',previousLocation:'Previously saved on page 90'};
const entryB={...entryA,meaning:'reduction',previousLocation:'Previously saved on page 12'};
test('distinct suggestions, per-entry dismissal, late-response filtering and compact Follow-Along presentation',()=>{
 let dismissed=[];const props={entries:[entryA,entryB],searched:true,dismissedKeys:dismissed,onSelect(){},onDismiss(e){dismissed.push(personalVocabularyEntryKey(e))}};
 const tree=Results(props);const items=walk(tree).filter(n=>n.type==='li');assert.equal(items.length,2);walk(items[0]).find(n=>n.type==='button'&&n.props.children==='Not this one').props.onClick();
 const dismissedMarkup=renderToStaticMarkup(React.createElement(Results,{...props,dismissedKeys:dismissed,entries:[{...entryA},entryB]}));assert.doesNotMatch(dismissedMarkup,/restoration|page 90/);assert.match(dismissedMarkup,/reduction/);
 const reset=renderToStaticMarkup(React.createElement(Results,{...props,dismissedKeys:[]}));assert.match(reset,/restoration/);
 const compact=renderToStaticMarkup(React.createElement(Results,{...props,showPreviousLocation:false}));assert.doesNotMatch(compact,/Previously saved (on|at|in)|page 90|page 12|Chapter|count/i);assert.match(compact,/Use this entry/);assert.match(compact,/Not this one/);
});
test('Curiosity selection copies vocabulary only, preserves the current location, creates an unsaved draft, and never writes',()=>{
 const source=fs.readFileSync('app/(protected)/books/[userBookId]/curiosity-reading/WordTimerExperience.tsx','utf8');const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const callbacks=[];function visit(n){if(ts.isJsxAttribute(n)&&n.name.text==='onSelect'&&n.initializer?.expression&&n.initializer.expression.getText(ast).includes('alternateSurface: entry.alternativeSurface'))callbacks.push(n.initializer.expression.getText(ast));ts.forEachChild(n,visit)}visit(ast);assert.equal(callbacks.length,2);
 for(const callback of callbacks){let draft={id:'editing-row',page:'77',positionUnit:'kindle_location',chapterNumber:'5',chapterName:'Current chapter'};const fn=new Function('setQuickPreview','invalidateQuickLookup','setSelectedQuickLookupCandidateId','setSelectedPersonalEntryKey','setQuickError','jumpToQuickWordFields',compile('return '+callback))(fn=>{draft=fn(draft)},()=>{},()=>{},()=>{},()=>{},()=>{});fn({...entryA,previousLocation:'Previously saved on page 90'});assert.equal(draft.id,null);assert.equal(draft.page,'77');assert.equal(draft.positionUnit,'kindle_location');assert.equal(draft.chapterName,'Current chapter');assert.equal(draft.alternateSurface,'還原');assert.equal(draft.meaning,'restoration');}
 assert.doesNotMatch(source,/setDismissedPersonalEntries\(\[\]\); \}, \[quickPreview.surface\]/);assert.match(functionText(source,'clearQuickWordFields'),/setDismissedPersonalEntries\(\[\]\)/);assert.equal((source.match(/!isListeningMode && !studentContext/g)??[]).length,3);
 assert.match(followSource,/setDismissedPersonalEntries\(\[\]\); \}, \[activeAddAfterWordId, userBookId\]/);
});
test('actual Follow-Along Save inserts another occurrence at the current location, leaving earlier row content intact',async()=>{
 const sourceRecord={id:'old',surface:'還元',reading:'かんげん',meaning:'restoration',page_number:34,chapter_number:2};const before=structuredClone(sourceRecord);let inserted;
 const deps={supabase:{auth:{getUser:async()=>({data:{user:{id:'owner-a'}}})},from(table){assert.equal(table,'user_book_words');return {insert(payload){inserted={id:'new',...payload};return {select(){return {single:async()=>({data:inserted,error:null})}}}}}}},renumberGroupWithInsertedWord:async()=>new Map()};
 const code=`let addAfterDraft={word:'還元',reading:'かんげん',meaning:'restoration',selectedPersonalEntry:true,jlpt:'NON-JLPT',isCommon:false,meaningChoices:[],meaningChoiceIndex:null,candidates:[]};const userBookId='${BOOK}',canAccessBook=true,canUseSavedWordReading=true,newWordPosition='77',newWordUnit='page',activeAddPlacement='after',personalLookupVersion={current:0};const setAddAfterDraft=fn=>{addAfterDraft=typeof fn==='function'?fn(addAfterDraft):fn},setCapturePositions=()=>{},setWords=()=>{},setActiveAddAfterWordId=()=>{},setActiveAddPlacement=()=>{};const makeBlankAddAfterDraft=()=>({});const parseWordPosition=()=>({value:77,error:null});const wordPosition=r=>({unit:r.position_unit,value:r.position_value});const wordPositionPayload=(value,unit)=>({position_unit:unit,position_value:value,page_number:unit==='page'?value:null,percent_location:null});const isReadyForFlashcards=()=>true,todayYmdAppTimeZone=()=> '2026-10-01',hasKanji=()=>true,normalizeJlpt=x=>x;const generateVocabularyKanjiMap=()=>{throw Error('Not a dictionary selection')};const {supabase,renumberGroupWithInsertedWord}=deps;${functionText(followSource,'saveAddAfterWord')};return saveAddAfterWord(anchor);`;
 await new Function('deps','anchor',compile(code))(deps,{...sourceRecord,chapter_number:5,chapter_name:'Current chapter',page_order:1});assert.equal(inserted.page_number,77);assert.equal(inserted.chapter_number,5);assert.equal(inserted.chapter_name,'Current chapter');assert.equal(inserted.meaning,'restoration');assert.deepEqual(sourceRecord,before);assert.notEqual(inserted.id,sourceRecord.id);
});

test('dictionary canonicalization does not reset dismissals in either capture flow',()=>{
 const curiosity=fs.readFileSync('app/(protected)/books/[userBookId]/curiosity-reading/WordTimerExperience.tsx','utf8');
 assert.doesNotMatch(functionText(curiosity,'pullQuickWord'),/setDismissedPersonalEntries/);
 assert.doesNotMatch(functionText(followSource,'lookupAddAfterWord'),/setDismissedPersonalEntries/);
 const entry={...entryA};const dismissed=[personalVocabularyEntryKey(entry)];const markup=renderToStaticMarkup(React.createElement(Results,{entries:[entry,entryB],searched:true,dismissedKeys:dismissed,onSelect(){},onDismiss(){}}));assert.doesNotMatch(markup,/restoration/);assert.match(markup,/reduction/);
});
