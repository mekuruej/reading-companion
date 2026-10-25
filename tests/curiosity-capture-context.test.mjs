import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function load(file){const exports={};new Function('require','exports',compile(fs.readFileSync(file,'utf8')))(name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):require(name),exports);return exports;}
const helpers=load('lib/vocabulary/curiosityCaptureContext.ts');
const {rememberedCaptureContext,vocabularyCaptureContext,restoreCaptureContext}=helpers;
const blank={id:null,page:'',chapterNumber:'',chapterName:'',positionUnit:'page',surface:''};
for(const [unit,page] of [['page','77'],['kindle_location','1234'],['percent','12.5']])test(`restores a coherent ${unit} capture with its chapter`,()=>{
 const context=rememberedCaptureContext({page,positionUnit:unit,chapterNumber:'5',chapterName:'Current'},unit);assert.deepEqual(restoreCaptureContext(blank,context,false),{...blank,page,positionUnit:unit,chapterNumber:'5',chapterName:'Current'});
 assert.equal(vocabularyCaptureContext({position_unit:unit,position_value:Number(page),chapter_number:5,chapter_name:'Current'},unit).page,page);
});
test('missing chapters remain empty; legacy page/percent fields work but page_order is never a location',()=>{
 assert.deepEqual(vocabularyCaptureContext({page_number:8,page_order:99},'page'),{page:'8',positionUnit:'page',chapterNumber:'',chapterName:''});assert.equal(vocabularyCaptureContext({percent_location:25},'percent').page,'25');assert.equal(vocabularyCaptureContext({page_order:99},'page'),null);
});
for(const [name,row,unit] of [['missing',null,'page'],['unknown canonical',{position_unit:'page',position_value:null,page_number:8},'page'],['different unit',{position_unit:'kindle_location',position_value:12},'page'],['invalid percent',{position_unit:'percent',position_value:101},'percent'],['fractional page',{page_number:3.5},'page']])test(`does not invent location: ${name}`,()=>assert.equal(vocabularyCaptureContext(row,unit),null));
test('malformed, unversioned, invalid, and wrong-unit browser values are rejected coherently',()=>{
 for(const value of [null,{},'oops',{page:'9',chapterName:'Chapter from unknown unit'},{page:'bad',positionUnit:'page',chapterName:'Do not borrow'},{page:'9',positionUnit:'kindle_location',chapterName:'Wrong unit'}])assert.equal(rememberedCaptureContext(value,'page'),null);
});
test('active context, existing edit, explicit clear, or any user-entered chapter prevents all restoration',()=>{
 const remembered={page:'90',positionUnit:'page',chapterNumber:'2',chapterName:'Old'};
 for(const current of [{...blank,page:'77'},{...blank,chapterName:'New'},{...blank,chapterNumber:'5'},{...blank,id:'existing'}])assert.equal(restoreCaptureContext(current,remembered,false),current);
 assert.equal(restoreCaptureContext(blank,remembered,true),blank);
});
const source=fs.readFileSync('app/(protected)/books/[userBookId]/curiosity-reading/WordTimerExperience.tsx','utf8');
const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function effectContaining(text){let result;function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes(text))result=n.arguments[0].getText(ast);ts.forEachChild(n,visit)}visit(ast);assert.ok(result);return result;}
const restoreEffect=effectContaining('async function restoreRememberedCapture');
const tick=()=>new Promise(setImmediate);
function harness({stored={},row=null,request,unit='page',current=blank,edited=false,listening=false,student=false,error=null}={}){
 let draft={...current},ready=false,queries=[],dirty={current:edited};const q={select(fields){queries.push(['select',fields]);return q},eq(k,v){queries.push([k,v]);return q},order(){return q},limit(n){assert.equal(n,1);return request??Promise.resolve({data:row?[row]:[],error})}};
 const deps={...helpers,isListeningMode:listening,tracking:{loaded:true,method:unit},userBookId:'current-book',canAccessBook:true,getSavedQuickMeta:()=>stored,studentContext:student?{}:null,captureContextEdited:dirty,setCaptureContextReady:v=>ready=v,setQuickPreview:f=>draft=f(draft),supabase:{auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from(table){assert.equal(table,'finalized_user_book_words');return q}}};
 const cleanup=new Function(...Object.keys(deps),compile('return ('+restoreEffect+')();'))(...Object.values(deps));return {cleanup,dirty,get draft(){return draft},get ready(){return ready},queries};
}
test('explicit browser capture state wins over newer unrelated session/book/vocabulary progress',async()=>{
 const h=harness({stored:{page:'77',positionUnit:'page',chapterNumber:'5',chapterName:'Remembered'},row:{page_number:300,chapter_name:'Other'}});await tick();assert.equal(h.draft.page,'77');assert.equal(h.draft.chapterName,'Remembered');assert.equal(h.queries.length,0);
});
test('latest finalized owner/book capture is used only without appropriate remembered state',async()=>{
 const h=harness({row:{page_number:34,chapter_number:2,chapter_name:'Same row'}});await tick();assert.equal(h.draft.page,'34');assert.equal(h.draft.chapterName,'Same row');assert.ok(h.queries.some(([k,v])=>k==='user_book_id'&&v==='current-book'));assert.ok(h.queries.some(([k,v])=>k==='user_books.user_id'&&v==='owner'));assert.equal(h.ready,true);
});
for(const kind of ['edit','clear','cancel'])test(`late history cannot overwrite ${kind}`,async()=>{
 let resolve;const request=new Promise(r=>resolve=r);const h=harness({request});await tick();if(kind==='cancel')h.cleanup();else h.dirty.current=true;resolve({data:[{page_number:90,chapter_number:2,chapter_name:'Old'}],error:null});await tick();assert.equal(h.draft.page,'');assert.equal(h.draft.chapterName,'');
});
test('no history, failed history, wrong-unit history, and excluded Listening contexts remain blank',async()=>{
 for(const options of [{},{error:Error('synthetic')},{row:{position_unit:'percent',position_value:50}},{listening:true},{student:true}]){const h=harness(options);await tick();assert.equal(h.draft.page,'');assert.equal(h.draft.chapterName,'');}
});
test('desktop recognition precedes dictionary choices; mobile slot precedes candidate buttons',()=>{
 const desktop=source.slice(source.indexOf('<CuriosityQuickSearchRow'));assert.ok(desktop.indexOf('<PersonalVocabularyResults')<desktop.indexOf('<CuriosityDictionaryChoices'));
 const mobile=fs.readFileSync('app/(protected)/books/[userBookId]/curiosity-reading/components/MobileQuickCapture.tsx','utf8');assert.ok(mobile.indexOf('{recognition}')<mobile.indexOf('{candidates.length > 0'));
 assert.match(source,/personalVocabularyMatches.some\(entry => !dismissedPersonalEntries.includes/);
});
test('dictionary completion retains live capture context and both save actions retain the established save flow',()=>{
 assert.match(source,/page: isListeningMode \? savedMeta.page : current.page/);assert.match(source,/chapterName: isListeningMode \? savedMeta.chapterName : current.chapterName/);
 assert.match(source,/await saveQuickWord\(\{\}, draft\)/);assert.match(source,/await persistQuickWord\(draft, options\)/);
});
