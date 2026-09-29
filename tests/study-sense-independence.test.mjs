import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
function load(file) {
  const mod = {exports:{}};
  const js = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  new Function('require','module','exports',js)(name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):require(name),mod,mod.exports);
  return mod.exports;
}
const identity = load('lib/studySenseIdentity.ts');
const {savedSenseNumber,senseDefinitionKey,senseStudyKey,cardSenseKey,groupSavedSenseEncounters} = identity;
const {computeLibraryStudyColorStatus} = load('lib/libraryStudyColor.ts');
function functions(file,names,env={}) {
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const found=[];
  function visit(node) {
    if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.push(node.getText(ast));
    ts.forEachChild(node,visit);
  }
  visit(ast);assert.equal(found.length,names.length);
  const js=ts.transpileModule(found.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  return new Function(...Object.keys(env),js+`;return {${names.join(',')}}`)(...Object.values(env));
}
const check='app/(protected)/library-study/check/page.tsx';
const practice='app/(protected)/library-study/practice/page.tsx';
const wordKey='かける||かける';
const card=n=>({id:`sense-${n}`,studyIdentityKey:wordKey,definitionNumber:n,surface:'かける',reading:'かける',meaning:`meaning ${n}`,encounterCount:3,colorStatus:{color:'blue'},activeGate:'meaning',progress:null});

test('only selected saved senses generate groups; contexts stay with their sense',()=>{
 const rows=[{id:'a',surface:'かける',reading:'かける',meaning:'hang',meaning_choice_index:0,context:'hat'},
 {id:'b',surface:'かける',reading:'かける',meaning:'call',meaning_choice_index:1,context:'phone'},
 {id:'c',surface:'かける',reading:'かける',meaning:'hang',meaning_choice_index:0,context:'coat'}];
 const groups=groupSavedSenseEncounters(rows,()=>wordKey);
 assert.equal(groups.size,2);
 assert.deepEqual(groups.get(senseStudyKey(wordKey)).map(x=>x.context),['hat','coat']);
 assert.deepEqual(groups.get(senseStudyKey(wordKey,'2')).map(x=>x.context),['phone']);
 assert.equal(new Set(rows.map(()=>wordKey)).size,1);
 assert.equal(savedSenseNumber(null),1);
});
test('daily dedupe and seen state retain a sibling sense',()=>{
 const {dedupeCardsByStudyIdentity,isCardSeenToday}=functions(check,['dedupeCardsByStudyIdentity','isCardSeenToday'],{cardSenseKey});
 const one=card(1),two=card(2);
 assert.equal(dedupeCardsByStudyIdentity([one,two,{...one}]).length,2);
 const seen=new Set([one.id,cardSenseKey(one)]);
 assert.equal(isCardSeenToday(one,seen),true);
 assert.equal(isCardSeenToday(two,seen),false);
});
for(const file of [check,practice])test(`${file}: gate save changes only the selected sense`,async()=>{
 const one=card(1),two=card(2);
 const state=new Map([[cardSenseKey(one),{definition_key:'',mastered:true,reading_gate_status:'passed',meaning_gate_status:'passed'}]]);
 const before=structuredClone(state.get(cardSenseKey(one)));
 const supabase={from(table){assert.equal(table,'user_library_word_progress');return {
 upsert(row,options){assert.equal(options.onConflict,'user_id,study_identity_key,definition_key');state.set(senseStudyKey(row.study_identity_key,row.definition_key),row);return this;},select(){return this;},single:async()=>({error:null})};}};
 const {saveTypedGateProgress}=functions(file,['saveTypedGateProgress'],{...identity,supabase,currentCard:two,currentUserId:'u',canUseAbilityCheck:true,canUseLibraryReview:true,setNotice:assert.fail});
 await saveTypedGateProgress('meaning',false,{card:two});
 assert.deepEqual(state.get(cardSenseKey(one)),before);
 assert.equal(state.get(cardSenseKey(two)).meaning_gate_status,'failed');
 assert.equal(state.get(cardSenseKey(two)).mastered,false);
 assert.equal(state.get(cardSenseKey(two)).meaning_gate_attempts,1);
 await saveTypedGateProgress('meaning',true,{card:{...two,progress:state.get(cardSenseKey(two))}});
 assert.equal(state.get(cardSenseKey(two)).meaning_gate_attempts,2);
 assert.deepEqual(state.get(cardSenseKey(one)),before);
});
test('sending Definition 2 back to support leaves Definition 1 mastered in memory and storage',async()=>{
 const one={...card(1),progress:{mastered:true},colorStatus:{color:'purple'}};
 const two={...card(2),colorStatus:{color:'yellow',nextGate:'reading'},activeGate:'readiness'};
 let cards=[one,two],written;
 const supabase={from(){return {upsert(row){written=row;return this},select(){return this},single:async()=>({data:written,error:null})}}};
 const {comeBackLaterForCurrentCard}=functions(check,['comeBackLaterForCurrentCard'],{...identity,supabase,currentCard:two,currentUserId:'u',canUseAbilityCheck:true,canComeBackLater:()=>true,learningSettings:{red_stages:1,orange_stages:1,yellow_stages:1},computeLibraryStudyColorStatus,preReadingSupportCycle:p=>Math.max(2,p.reading_gate_attempts+1),setAllCards:fn=>{cards=fn(cards)},markStudyCardSeen:()=>{},nextCardWithoutMarkingSeen:()=>{},setNotice:assert.fail});
 await comeBackLaterForCurrentCard('hard');
 assert.equal(written.definition_key,'2');
 assert.equal(cards[0],one);
 assert.equal(cards[1].colorStatus.color,'red');
 assert.equal(cards[1].colorStatus.stageNumber,2);
});
test('book color lookup shows independent colors and word-level callers stay deterministic',async()=>{
 const {fetchLibraryStudyColorInfoByWord,makeLibraryStudyColorKey}=load('lib/libraryStudyColorLookup.ts');
 const data={user_learning_settings:{red_stages:1,orange_stages:1,yellow_stages:1},user_library_word_summaries:[{study_identity_key:wordKey,surface:'かける',reading:'かける',total_encounter_count:2}],user_book_words:[{surface:'かける',reading:'かける',meaning_choice_index:0},{surface:'かける',reading:'かける',meaning_choice_index:1}],user_library_word_progress:[{study_identity_key:wordKey,definition_key:'',reading_gate_status:'passed',meaning_gate_status:'passed',mastered:true},{study_identity_key:wordKey,definition_key:'2',reading_gate_status:'not_started',meaning_gate_status:'not_started',held_before_reading_gate:true,held_before_meaning_gate:true,reading_gate_attempts:1,mastered:false}]};
 const client={from(table){const q={then(resolve){return Promise.resolve({data:data[table]}).then(resolve)}};for(const method of ['select','eq','in','or','not','order','range','maybeSingle'])q[method]=()=>q;return q;}};
 const result=await fetchLibraryStudyColorInfoByWord(client,'u',[{surface:'かける',reading:'かける'},{surface:'かける',reading:'かける',senseNumber:1},{surface:'かける',reading:'かける',senseNumber:2}]);
 assert.equal(result[makeLibraryStudyColorKey('かける','かける',1)].colorStatus.color,'purple');
 assert.equal(result[makeLibraryStudyColorKey('かける','かける',2)].colorStatus.color,'red');
 assert.equal(result[makeLibraryStudyColorKey('かける','かける',2)].colorStatus.stageNumber,2);
 assert.equal(result[makeLibraryStudyColorKey('かける','かける')].encounterCount,2);
 assert.equal(result[makeLibraryStudyColorKey('かける','かける')].colorStatus.color,'purple');
});
test('book meaning checks reject an answer belonging only to a different sense',()=>{
 const file='app/(protected)/books/[userBookId]/study/page.tsx';
 const meaning=functions(file,['normalizeMeaning','meaningWords','meaningMatchesOneWord']);
 let feedback;
 const env={typeModeEnabled:true,card:{meaning:'hang',meaningChoices:['hang','call']},typedInput:'call',kataToHira:x=>x,studySet:'MEANING',...meaning,setTypedFeedback:x=>feedback=x,setTypeRevealIndex:()=>{},setLastTypedResult:()=>{},setReadyForNextCard:()=>{},clearTypedInput:()=>{},steps:[1]};
 functions(file,['checkTypedAnswer'],env).checkTypedAnswer();
 assert.equal(feedback.ok,false);
 functions(file,['checkTypedAnswer'],{...env,typedInput:'hang'}).checkTypedAnswer();
 assert.equal(feedback.ok,true);
});
for(const file of [check,practice])test(`${file}: reload indexes each saved progress row by both identities`,async()=>{
 const rows=[{study_identity_key:wordKey,definition_key:'',mastered:true},{study_identity_key:wordKey,definition_key:'2',mastered:false}];
 const client={from(){return {select(){return this},eq(column){assert.notEqual(column,'definition_key');return this},in(){return this},returns:async()=>({data:rows,error:null})}}};
 const {loadLibraryProgressByKey}=functions(file,['uniqueStrings','loadLibraryProgressByKey'],{supabase:client,LIBRARY_PROGRESS_KEY_BATCH_SIZE:75,senseStudyKey});
 const saved=await loadLibraryProgressByKey('u',[wordKey]);
 assert.equal(saved.size,2);
 assert.equal(saved.get(cardSenseKey(card(1))).mastered,true);
 assert.equal(saved.get(cardSenseKey(card(2))).mastered,false);
});
