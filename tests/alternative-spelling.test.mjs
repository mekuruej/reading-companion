import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(file){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(name=>{if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?name.slice(2):path.join(path.dirname(file),name);return load([base+'.ts',base+'.tsx'].find(fs.existsSync));}return require(name);},mod,mod.exports);return mod.exports;}
const {promotedSpelling}=load('lib/vocabulary/alternativeSpelling.ts');
const Alternative=load('components/vocabulary/AlternativeSpellingField.tsx').default;
const AlsoWritten=load('components/vocabulary/AlsoWritten.tsx').default;
const {followAlongSurface}=load('lib/vocabulary/wordContext.ts');
const {groupSavedSenseEncounters}=load('lib/studySenseIdentity.ts');
function nodes(n){if(!n||typeof n!=='object')return[];return[n,...React.Children.toArray(n.props?.children).flatMap(nodes)];}
test('explicit promotion swaps only the two forms and answer content follows the saved alternative',()=>{
 let row={id:'existing',surface:'読む',alternative_surface:'讀む',reading:'よむ',meaning:'to read',book_form:'讀んでいた',study_identity_key:'読む||よむ',user_book_id:'student-copy',reviewCount:9};
 const before={...row};
 let tree=Alternative({main:row.surface,value:row.alternative_surface,onChange:value=>{row={...row,alternative_surface:value};},onPromote:forms=>{row={...row,...forms};}});
 const render=(visible)=>renderToStaticMarkup(React.createElement(AlsoWritten,{value:row.alternative_surface,visible}));
 assert.equal(row.surface,'読む');assert.equal(render(false),'');assert.match(render(true),/Also written: 讀む/);
 nodes(tree).find(n=>n.type==='button').props.onClick();
 assert.equal(row.surface,'讀む');assert.equal(row.alternative_surface,'読む');assert.match(render(true),/Also written: 読む/);
 for(const key of ['id','reading','meaning','book_form','user_book_id','reviewCount','study_identity_key'])assert.equal(row[key],before[key]);
 assert.equal(followAlongSurface(row),'讀んでいた');assert.equal(followAlongSurface({...row,book_form:null}),'讀む');
 tree=Alternative({main:row.surface,value:row.alternative_surface,onChange:value=>{row={...row,alternative_surface:value};},onPromote:forms=>{row={...row,...forms};}});
 nodes(tree).find(n=>n.type==='input').props.onChange({target:{value:'読ム'}});assert.equal(row.surface,'讀む');
 assert.equal(promotedSpelling('読む','  '),null);assert.equal(promotedSpelling('読む','読む'),null);
 assert.equal(renderToStaticMarkup(React.createElement(AlsoWritten,{value:' '})),'');
});
test('Library Review groups a promoted form under its existing sense/progress identity',()=>{
 const rows=[{surface:'讀む',reading:'よむ',meaning:'to read',study_identity_key:'読む||よむ',meaning_choice_index:1}];
 const groups=groupSavedSenseEncounters(rows,(surface,reading)=>`${surface}||${reading}`);
 assert.deepEqual([...groups.keys()],[JSON.stringify(['読む||よむ','2'])]);assert.equal([...groups.values()][0][0].surface,'讀む');
});
test('new reader payloads use Main word directly; alternatives and promotions stay out of Live capture',()=>{
 for(const file of ['app/(protected)/books/[userBookId]/add-word/page.tsx','app/(protected)/books/[userBookId]/curiosity-reading/WordTimerExperience.tsx']){
  const source=fs.readFileSync(file,'utf8');assert.ok(source.includes('onPromoteAlternative='));assert.ok(source.includes('alternative_surface:'));assert.ok(!source.includes('useAlternateSurface ?'));
 }
 const source=fs.readFileSync('app/(protected)/teacher/students/[studentId]/books/[userBookId]/lesson-add/LiveLessonQuickAddPanel.tsx','utf8');
 const capture=source.slice(source.indexOf('<form onSubmit={captureWord}'),source.indexOf('</form>',source.indexOf('<form onSubmit={captureWord}')));
 assert.ok(!capture.includes('AlternativeSpellingField'));assert.ok(source.includes('AlternativeSpellingField main={draft.surface}'));
 const study=fs.readFileSync('app/(protected)/books/[userBookId]/study/page.tsx','utf8');assert.ok(study.includes('word: w.surface'));assert.ok(study.includes('<AlsoWritten value={card?.alternative_surface}'));assert.ok(study.includes('stepIndex >= steps.length - 1'));
});
