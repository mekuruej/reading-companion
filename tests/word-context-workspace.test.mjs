import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url), root=path.resolve(import.meta.dirname,'..'), cache=new Map();
function load(relative){
 const filename=path.resolve(root,relative); if(cache.has(filename))return cache.get(filename).exports;
 const mod={exports:{}};cache.set(filename,mod);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',code)(name=>{
  if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?path.join(root,name.slice(2)):path.resolve(path.dirname(filename),name);return load(['.ts','.tsx'].map(ext=>base+ext).find(fs.existsSync));}
  return require(name);
 },mod,mod.exports);return mod.exports;
}
const {wordContextPayload,followAlongSurface}=load('lib/vocabulary/wordContext.ts');
const Fields=load('components/vocabulary/WordContextFields.tsx').default;
const Card=load('app/(protected)/books/[userBookId]/readalong/components/ReadAlongWordCard.tsx').default;
const vocabulary=load('lib/teacher/teacherBookVocabulary.ts');
const sample={surface:'膨らませる',reading:'ふくらませる',meaning:'inflate',book_form:'膨らませて',book_form_description:'て-form',follow_along_support_note:'here: inflate a balloon'};
test('Follow-Along overrides spelling without mutating flashcard surface or meaning',()=>{
 const word={...sample,surface:'ふくらませる'}; assert.equal(followAlongSurface(word),'膨らませて');assert.equal(word.surface,'ふくらませる');assert.equal(word.meaning,'inflate');
 assert.equal(followAlongSurface({...word,book_form:null}),'ふくらませる');
 const html=renderToStaticMarkup(React.createElement(Card,{word:{id:'word',...word},supportMode:'full',isFaded:false,colorInfo:null,setWordRef(){},onProgressTap(){}}));
 for(const text of ['膨らませて','て-form','inflate','here: inflate a balloon'])assert.ok(html.includes(text));
 assert.ok(html.indexOf('inflate')<html.indexOf('here: inflate a balloon'));
});
test('teacher-only form controls; optional note available to readers and safe normalization',()=>{
 const render=teacher=>renderToStaticMarkup(React.createElement(Fields,{value:sample,onChange(){},teacher}));
 assert.ok(render(true).includes('Form in the book'));assert.ok(!render(false).includes('Form in the book'));assert.ok(render(false).includes('Optional context'));
 assert.deepEqual(wordContextPayload({book_form:'  ',book_form_description:3,follow_along_support_note:' note '}),{book_form:null,book_form_description:null,follow_along_support_note:'note'});
});
test('shared teacher vocabulary reload keeps form and note separate from flashcard spelling',async()=>{
 const row={id:'teacher-word',surface:sample.surface,reading:sample.reading,meaning:sample.meaning,...wordContextPayload(sample),alternative_surface:'ふくらませる',included_in_follow_along:true};
 const client={from(table){assert.equal(table,'teacher_book_vocabulary');return {select(){return this},eq(){return Promise.resolve({data:[{...row}]})}}}};
 const [word]=await vocabulary.loadSharedTeacherVocabulary(client,{teacherBookId:'book',personalUserBookId:null,linkedUserBookId:null});
 assert.equal(word.surface,'ふくらませる');assert.equal(followAlongSurface(word),'膨らませて');assert.equal(word.followAlongSupportNote,sample.follow_along_support_note);assert.equal(word.meaning,'inflate');
});
test('migration is repeatable and context survives PostgreSQL reload without changing primary word', {skip:!process.env.PGLITE_MODULE},async()=>{
 const {PGlite}=await import(process.env.PGLITE_MODULE);const db=new PGlite();try{
 await db.exec('create table user_book_words(id int primary key, surface text, meaning text); create table teacher_book_vocabulary(id int primary key, surface text, meaning text, follow_along_support_note text);');
 const sql=fs.readFileSync(path.join(root,'sql/20260927_word_book_forms.sql'),'utf8');await db.exec(sql);await db.exec(sql);
 for(const table of ['user_book_words','teacher_book_vocabulary']){
 await db.query(`insert into ${table}(id,surface,meaning,book_form,book_form_description,follow_along_support_note) values (1,$1,$2,$3,$4,$5)`,[sample.surface,sample.meaning,sample.book_form,sample.book_form_description,sample.follow_along_support_note]);
 const saved=(await db.query(`select * from ${table} where id=1`)).rows[0];assert.equal(saved.surface,sample.surface);assert.equal(saved.meaning,sample.meaning);assert.deepEqual(wordContextPayload(saved),wordContextPayload(sample));
 }
 }finally{await db.close()}
});

const lessonPath=path.join(root,'app/(protected)/books/[userBookId]/lesson/page.tsx');
let lessonState=[],lessonCursor=0,lessonQuery="",lastNavigation="";
const StubFollow=()=>React.createElement('div',null,'Follow-Along reader');
const StubLive=()=>React.createElement('div',null,'Student word capture');
const StubCapture=()=>React.createElement('div',null,'Core Add Word');
const StubProgress=({children})=>children;
const StubJournal=()=>React.createElement('div',null,'Book Journal · Grammar · Phrases · Translation · Special Vocab · Lesson Notes');
const lessonModule={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync(lessonPath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{
 if(name==='react')return {...React,useState(initial){const index=lessonCursor++;if(!(index in lessonState))lessonState[index]=initial;return [lessonState[index],value=>lessonState[index]=typeof value==='function'?value(lessonState[index]):value]},useEffect(){},useMemo:fn=>fn()};
 if(name==='next/navigation')return {useParams:()=>({userBookId:'own-book'}),useRouter:()=>({replace(href){lastNavigation=href}}),useSearchParams:()=>new URLSearchParams(lessonQuery)};
 if(name==='next/link')return {default:({children,...props})=>React.createElement('a',props,children),__esModule:true};
 if(name.includes('StoryNotesExperience'))return {default:StubJournal,__esModule:true};
 if(name.includes('WordTimerExperience'))return {CuriosityReadingExperience:StubCapture};
 if(name.includes('BookProgressProvider'))return {BookProgressProvider:StubProgress};
 if(name.includes('TeacherFollowAlongPanel'))return {TeacherFollowAlongPanel:StubFollow};
 if(name.includes('LiveLessonQuickAddPanel'))return {default:StubLive,__esModule:true};
 if(name.includes('supabaseClient'))return {supabase:{}};
 return require(name);
},lessonModule,lessonModule.exports);
function lesson(students=[],view='follow',query=''){lessonQuery=`view=${view}&${query}`;lessonState=[false,'',{teacherBookId:'teacher-book',sourceUserBookId:'own-book',book:{title:'Sample book'},students,chapterSuggestions:[]}];}
function renderLesson(){lessonCursor=0;return lessonModule.exports.default()}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)]}
function label(tree){return typeof tree==='string'?tree:Array.isArray(tree)?tree.map(label).join(''):label(tree?.props?.children??'')}
test('separate workspaces keep own capture, journal, and Follow-Along independent',()=>{
 lesson();let tree=renderLesson();assert.ok(nodes(tree).some(n=>n.type===StubFollow));assert.ok(!nodes(tree).some(n=>n.type===StubLive));
 lesson([],'curiosity');tree=renderLesson();
 const capture=nodes(tree).find(n=>n.type===StubCapture);assert.equal(capture.props.targetUserBookId,'own-book');
 assert.equal(capture.props.workspaceCompact,true);assert.equal(capture.props.wordCaptureOnly,true);
 assert.equal(nodes(tree).find(n=>n.type===StubProgress).props.readOnly,true);
 assert.deepEqual(nodes(tree).filter(n=>n.type==='option').map(label),['Me / My Book']);
 assert.ok(!nodes(tree).some(n=>n.type===StubJournal||n.type==='nav'));
 lesson([],'journal','studentUserBookId=unrelated-book');tree=renderLesson();
 assert.ok(nodes(tree).some(n=>n.type===StubJournal&&n.props.teaching));
 assert.ok(!nodes(tree).some(n=>n.type===StubCapture||n.type==='select'||n.type===StubLive));
});
const studentA={studentId:'student-a',studentUserBookId:'student-book-a',lessonBookId:'link-a',studentName:'Learner A'};
const studentB={studentId:'student-b',studentUserBookId:'student-book-b',lessonBookId:'link-b',studentName:'Learner B'};
for(const students of [[studentA],[studentA,studentB]])test(`${students.length} students: same full form targets words only; Follow-Along stays mine`,()=>{
 lesson(students,'curiosity');let tree=renderLesson();
 assert.equal(nodes(tree).find(n=>n.type===StubCapture).props.targetUserBookId,'own-book');
 assert.ok(!nodes(tree).some(n=>n.type===StubLive));
 const select=nodes(tree).find(n=>n.type==='select');assert.equal(select.props.value,'');
 const selected=students.at(-1);select.props.onChange({target:{value:selected.studentUserBookId}});assert.ok(lastNavigation.includes('view=curiosity'));assert.ok(lastNavigation.includes(selected.studentUserBookId));
 lesson(students,'curiosity',`studentUserBookId=${selected.studentUserBookId}`);tree=renderLesson();
 assert.equal(nodes(tree).find(n=>n.type===StubCapture).props.targetUserBookId,selected.studentUserBookId);
 const provider=nodes(tree).find(n=>n.type===StubProgress);assert.equal(provider.props.userBookId,selected.studentUserBookId);assert.equal(provider.key,selected.studentUserBookId);
 lesson(students,'follow',`studentUserBookId=${selected.studentUserBookId}`);tree=renderLesson();
 const live=nodes(tree).find(n=>n.type===StubLive);assert.equal(live.props.userBookId,selected.studentUserBookId);assert.equal(live.props.sourceUserBookId,'own-book');
 assert.equal(nodes(tree).find(n=>n.type===StubFollow).props.teacherBookId,'teacher-book');assert.ok(!nodes(tree).some(n=>n.type===StubCapture));
 const quickPane=nodes(tree).find(n=>n.type==='div'&&nodes(n).some(child=>child.type===StubLive)&&nodes(n).some(child=>child.type==='select')&&!nodes(n).some(child=>child.type===StubFollow));assert.ok(quickPane);
 lesson(students,'journal',`studentUserBookId=${selected.studentUserBookId}`);tree=renderLesson();assert.ok(!nodes(tree).some(n=>n.type==='select'));assert.ok(nodes(tree).some(n=>n.type===StubJournal));
});

if(process.env.UI_FIXTURE){
 const css=fs.readdirSync(path.join(root,'.next/static/css')).filter(n=>n.endsWith('.css')).map(n=>fs.readFileSync(path.join(root,'.next/static/css',n),'utf8')).join('\n');
 const fields=renderToStaticMarkup(React.createElement(Fields,{value:sample,teacher:true,onChange(){}}));
 const card=renderToStaticMarkup(React.createElement(Card,{word:{id:'w',...sample},supportMode:'full',isFaded:false,colorInfo:null,setWordRef(){},onProgressTap(){}}));
 const doc=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body class="bg-stone-50 p-4"><h1 class="text-xl font-bold mb-4">Sample book</h1><section class="rounded-xl bg-white p-3 space-y-3"><h2 class="font-semibold">Add Word</h2><label class="block text-xs">Alternative spelling / kanji<input class="w-full rounded-lg border px-2 py-1.5 text-sm" value="ふくらませる"></label>${fields}</section><div class="mt-4">${card}</div></body></html>`;
 const escaped=doc.replaceAll('&','&amp;').replaceAll('"','&quot;');
 fs.writeFileSync(process.env.UI_FIXTURE,`<!doctype html><h2>Mobile 390px</h2><iframe width="390" height="630" srcdoc="${escaped}"></iframe><h2>Desktop 1100px</h2><iframe width="1100" height="450" srcdoc="${escaped}"></iframe>`);
}

test('Save Words targets do not replace the independently authorized Quick Add list or Journal',()=>{
 const trial={studentId:'trial-user',studentUserBookId:'trial-copy',studentName:'Trial Reader'};
 lesson([studentA],'curiosity','studentUserBookId=trial-copy');
 lessonState[2].saveWordTargets=[studentA,trial];
 let tree=renderLesson();
 assert.deepEqual(nodes(tree).filter(n=>n.type==='option').map(label),['Me / My Book','Learner A','Trial Reader']);
 assert.equal(nodes(tree).find(n=>n.type===StubCapture).props.targetUserBookId,'trial-copy');
 lesson([studentA],'follow');lessonState[2].saveWordTargets=[studentA,trial];tree=renderLesson();
 assert.deepEqual(nodes(tree).filter(n=>n.type==='option').map(label),['Choose a student','Learner A']);
 assert.equal(nodes(tree).find(n=>n.type===StubLive).props.userBookId,studentA.studentUserBookId);
 lesson([studentA],'journal','studentUserBookId=trial-copy');lessonState[2].saveWordTargets=[studentA,trial];tree=renderLesson();
 assert.ok(!nodes(tree).some(n=>n.type==='select'));assert.ok(nodes(tree).some(n=>n.type===StubJournal));
});


test('Follow-Along Quick Add accepts an authorized trial target without a lesson assignment',()=>{
 const trial={lessonBookId:null,studentId:'trial-user',studentUserBookId:'trial-copy',studentName:'Trial Reader'};
 lesson([studentA,trial],'follow','studentUserBookId=trial-copy');
 const tree=renderLesson();
 assert.ok(nodes(tree).filter(n=>n.type==='option').map(label).includes('Trial Reader'));
 const quick=nodes(tree).find(n=>n.type===StubLive);
 assert.equal(quick.props.studentId,'trial-user');assert.equal(quick.props.userBookId,'trial-copy');
 assert.equal(nodes(tree).find(n=>n.type===StubFollow).props.teacherBookId,'teacher-book');
});
